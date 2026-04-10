"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

/**
 * ASSIGNMENT ENGINE - High Level Architecture
 * 
 * This engine handles the automatic distribution of incoming conversations to human agents.
 * 
 * CORE PRINCIPLES:
 * 1. Atomicity: To prevent two messages from being assigned to the same agent simultaneously 
 *    (race conditions), the engine prioritizes a Postgres RPC `fn_get_next_agent_atomic`.
 *    This RPC uses Postgres Advisory Locks to ensure sequential processing.
 * 
 * 2. Qualified Agents: An agent is eligible ONLY if:
 *    - Status is 'online'
 *    - 'auto_assign_enabled' is true
 *    - Heartbeat (last_seen_at) is < 3 minutes.
 *      WARNING: This is a strict threshold. If an agent's dashboard is not open or they haven't had 
 *      activity in >3m, they are EXCLUDED. This is a known point that may need "polishing" (threshold extension).
 *    - They have access to the channel (Admin role OR explicit binding in agent_channels)
 * 
 * 3. Load Balancing (Balanced Mode): 
 *    - Relies on `agent_availability.current_load`.
 *    - This column is synchronized via DB Triggers on the `conversations` table.
 *    - Mandatory Trigger: `trigger_update_agent_load` (see robust_agent_load_trigger.sql)
 * 
 * 4. Rotation (Round Robin / Specific Agents):
 *    - Relies on `assignment_history` table to identify the "last" agent.
 *    - Requires `organization_id` to be logged correctly to filter previous assignments.
 * 
 * 5. Fallback: If no rules match, the engine defaults to Load Balancing (Balanced).
 */
export async function assignConversation(conversationId: string): Promise<string | null> {

    // 1. Get conversation details
    const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('*, leads(*)')
        .eq('id', conversationId)
        .single()

    if (convError || !conv) {
        console.error('[AssignmentEngine] Failed to fetch conversation:', convError)
        return null
    }

    // 2. Check if already assigned
    // Skip if already assigned
    if (conv.assigned_to) return conv.assigned_to
    const orgId = conv.organization_id

    // 3. Find matching assignment rule (by priority)
    const rule = await findMatchingRule(conv)
    // orgId is now passed as a parameter, no need to re-extract from conv

    let agentId: string | null = null
    let strategy: string = 'fallback-balance'
    let ruleId: string | null = null

    if (!rule) {
        // Fallback: use load-balance across all org agents
        agentId = await loadBalanceAssignment(orgId, undefined, conv.channel, conv.connection_id)
    } else {
        // 4. Execute strategy
        agentId = await executeStrategy(rule, conv)
        strategy = rule.strategy
        ruleId = rule.id
    }

    // 5. Update conversation & log
    // NOTE: DB trigger `trigger_update_agent_load` handles incrementing/decrementing
    //       agent load automatically when `assigned_to` changes.
    if (agentId) {
        await supabaseAdmin
            .from('conversations')
            .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
            .eq('id', conversationId)

        await logAssignment(conversationId, agentId, ruleId, strategy, orgId)
        console.log(`[AssignmentEngine] ✅ Assigned to agent: ${agentId} via ${rule ? 'rule: ' + rule.name : 'fallback balance'}`)
    }

    return agentId
}

async function findMatchingRule(conv: any) {
    const { data: rules } = await supabaseAdmin
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', conv.organization_id)
        .eq('is_active', true)
        .order('priority', { ascending: true })

    if (!rules || rules.length === 0) return null

    // Filter rules that match conditions
    for (const rule of rules) {
        if (matchesConditions(conv, rule.conditions)) {
            return rule
        }
    }
    return null
}

function matchesConditions(conv: any, conditions: any): boolean {
    // Check channel
    if (conditions.channel && conditions.channel.length > 0) {
        if (!conditions.channel.includes(conv.channel)) {
            return false
        }
    }

    // Check specific connection_id
    if (conditions.connection_id && conditions.connection_id.length > 0) {
        if (!conditions.connection_id.includes(conv.connection_id)) {
            return false
        }
    }

    // Check tags
    if (conditions.tags && conditions.tags.length > 0) {
        const convTags = conv.tags || []
        const hasMatchingTag = conditions.tags.some((tag: string) =>
            convTags.includes(tag)
        )
        if (!hasMatchingTag) return false
    }

    // Check lead value
    if (conditions.leadValue) {
        const leadValue = conv.leads?.value || 0
        if (conditions.leadValue.min && leadValue < conditions.leadValue.min) return false
        if (conditions.leadValue.max && leadValue > conditions.leadValue.max) return false
    }

    // Check business hours
    if (conditions.businessHours) {
        const now = new Date()
        const hour = now.getHours()
        const day = now.getDay() // 0 = Sunday, 6 = Saturday

        // Skip weekends and non-business hours (9-17)
        if (day === 0 || day === 6 || hour < 9 || hour >= 17) {
            return false
        }
    }

    // Check priority
    if (conditions.priority && conditions.priority.length > 0) {
        if (!conditions.priority.includes(conv.priority)) {
            return false
        }
    }

    return true
}

async function executeStrategy(rule: any, conv: any): Promise<string | null> {
    const orgId = conv.organization_id
    switch (rule.strategy) {
        case 'round-robin':
            return await roundRobinAssignment(orgId, rule.assign_to, conv.channel, conv.connection_id, 'round-robin')
        case 'load-balance':
            return await loadBalanceAssignment(orgId, rule.assign_to, conv.channel, conv.connection_id)
        case 'skills-based':
            return await skillsBasedAssignment(conv, rule.assign_to, conv.channel, conv.connection_id)
        case 'specific-agent':
            const specificAgents = rule.assign_to
            if (!specificAgents || specificAgents.length === 0) {
                console.warn('[AssignmentEngine] Specific agent rule has no agents in assign_to:', rule.name)
                return null
            }
            
            let agentId: string | null = null
            // If only one agent, assign directly
            if (specificAgents.length === 1) {
                agentId = specificAgents[0]
            } else {
                // If multiple agents, use Round Robin rotation among them
                agentId = await roundRobinAssignment(orgId, specificAgents, conv.channel, conv.connection_id, 'specific-agent')
            }
            return agentId
        default:
            return null
    }
}

async function roundRobinAssignment(orgId: string, agentPool?: string[], channelType?: string, connectionId?: string, method: string = 'round-robin'): Promise<string | null> {
    // 1. Try Atomic RPC first (prevents race conditions)
    try {
        const { data: nextAgentId, error: rpcError } = await supabaseAdmin.rpc('fn_get_next_agent_atomic', {
            p_org_id: orgId,
            p_strategy: method,
            p_agent_pool: agentPool && agentPool.length > 0 ? agentPool : null,
            p_channel_type: channelType || null,
            p_connection_id: connectionId || null
        });

        if (!rpcError && nextAgentId) {
            return nextAgentId;
        }
        if (rpcError) console.warn('[AssignmentEngine] RPC Atomic Round Robin skipped/failed:', rpcError.message);
    } catch (e) {
        console.error('[AssignmentEngine] RPC Error:', e);
    }

    // 2. Manual Fallback Logic (Legacy/Non-Atomic)
    const methods = method === 'round-robin' ? ['round-robin', 'auto-rule'] : [method]
    
    let lastQuery = supabaseAdmin
        .from('assignment_history')
        .select('assigned_to, conversations!inner(organization_id)')
        .eq('conversations.organization_id', orgId)
        .in('assignment_method', methods)
        .order('created_at', { ascending: false })
        .limit(1)

    if (agentPool && agentPool.length > 0) {
        lastQuery = lastQuery.in('assigned_to', agentPool)
    }

    const { data: lastAssignment } = await lastQuery.maybeSingle()

    // Get available agents (scoped to org)
    let agentQuery = supabaseAdmin
        .from('agent_availability')
        .select('agent_id, organization_id, last_seen_at')
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)
        .eq('organization_id', orgId)
        .order('agent_id')

    if (agentPool && agentPool.length > 0) {
        agentQuery = agentQuery.in('agent_id', agentPool)
    }

    const { data: agents } = await agentQuery

    if (!agents || agents.length === 0) return null

    // Heartbeat validation (3 minutes threshold)
    const heartbeatThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const activeAgents = agents.filter(a => a.last_seen_at && a.last_seen_at > heartbeatThreshold);

    if (activeAgents.length === 0) return null;

    // Filter by Channel Access AND Admin Role
    const [rolesResult, accessResult] = await Promise.all([
        supabaseAdmin.from('organization_members').select('user_id, role, permissions').eq('organization_id', orgId).in('user_id', activeAgents.map(a => a.agent_id)),
        channelType ? supabaseAdmin.from('agent_channels').select('agent_id').or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`).eq('is_active', true) : Promise.resolve({ data: [] })
    ]);

    const membersMap = new Map((rolesResult.data || []).map(m => [m.user_id, m]));
    const authorizedAgentIds = new Set((accessResult.data || []).map(ca => ca.agent_id));

    const qualifiedAgents = activeAgents.filter(a => {
        const member = membersMap.get(a.agent_id);
        const isAdmin = ['admin', 'owner'].includes(member?.role?.toLowerCase());
        const hasChannelBinding = authorizedAgentIds.has(a.agent_id);
        const hasExplicitAccess = (member?.permissions as any)?.inbox_access?.includes(connectionId);
        return isAdmin || hasChannelBinding || hasExplicitAccess;
    });

    if (qualifiedAgents.length === 0) return null;

    // Find next agent in rotation
    const lastIndex = qualifiedAgents.findIndex(a => a.agent_id === lastAssignment?.assigned_to)
    const nextIndex = (lastIndex + 1) % qualifiedAgents.length
    return qualifiedAgents[nextIndex].agent_id
}

async function loadBalanceAssignment(orgId: string, agentPool?: string[], channelType?: string, connectionId?: string): Promise<string | null> {
    // 1. Try Atomic RPC first
    try {
        const { data: nextAgentId, error: rpcError } = await supabaseAdmin.rpc('fn_get_next_agent_atomic', {
            p_org_id: orgId,
            p_strategy: 'load-balance',
            p_agent_pool: agentPool && agentPool.length > 0 ? agentPool : null,
            p_channel_type: channelType || null,
            p_connection_id: connectionId || null
        });

        if (!rpcError && nextAgentId) {
            return nextAgentId;
        }
        if (rpcError) console.warn('[AssignmentEngine] RPC Atomic Load Balance skipped/failed:', rpcError.message);
    } catch (e) {
        console.error('[AssignmentEngine] RPC Error:', e);
    }

    // 2. Manual Fallback Logic
    let query = supabaseAdmin
        .from('agent_availability')
        .select('agent_id, current_load, max_capacity, status, organization_id, last_seen_at')
        .eq('organization_id', orgId)
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)
        .order('agent_id')

    if (agentPool && agentPool.length > 0) {
        query = query.in('agent_id', agentPool)
    }

    const { data: agents, error } = await query

    if (error || !agents || agents.length === 0) return null

    // Heartbeat validation (3 minutes threshold)
    const heartbeatThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const activeAgents = agents.filter(a => a.last_seen_at && a.last_seen_at > heartbeatThreshold);

    if (activeAgents.length === 0) return null;

    // 2. Filter by Channel Access AND Admin Role
    const [rolesResult, accessResult] = await Promise.all([
        supabaseAdmin.from('organization_members').select('user_id, role, permissions').eq('organization_id', orgId).in('user_id', activeAgents.map(a => a.agent_id)),
        channelType ? supabaseAdmin.from('agent_channels').select('agent_id').or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`).eq('is_active', true) : Promise.resolve({ data: [] })
    ]);

    const membersMap = new Map((rolesResult.data || []).map(m => [m.user_id, m]));
    const authorizedAgentIds = new Set((accessResult.data || []).map(ca => ca.agent_id));

    const qualifiedAgents = activeAgents.filter(a => {
        const member = membersMap.get(a.agent_id);
        const isAdmin = ['admin', 'owner'].includes(member?.role?.toLowerCase());
        const hasChannelBinding = authorizedAgentIds.has(a.agent_id);
        const hasExplicitAccess = (member?.permissions as any)?.inbox_access?.includes(connectionId);
        return isAdmin || hasChannelBinding || hasExplicitAccess;
    });

    if (qualifiedAgents.length === 0) return null;

    // 3. Find agent with lowest load percentage
    const sorted = qualifiedAgents
        .filter(a => a.current_load < a.max_capacity)
        .map(a => ({
            ...a,
            loadPercentage: (a.current_load / a.max_capacity) * 100
        }))
        // Random jitter for fairness in ties
        .sort((a, b) => (a.loadPercentage - b.loadPercentage) || (Math.random() - 0.5))

    return sorted[0]?.agent_id || null
}

async function skillsBasedAssignment(conv: any, agentPool?: string[], channelType?: string, connectionId?: string): Promise<string | null> {
    const orgId = conv.organization_id
    // Extract required skills from conversation tags
    const requiredSkills = conv.tags || []

    if (requiredSkills.length === 0) {
        // No skills required, fallback to load balance
        return await loadBalanceAssignment(orgId, agentPool, channelType, connectionId)
    }

    // Find agents with matching skills
    let query = supabaseAdmin
        .from('agent_skills')
        .select('agent_id, skill, proficiency')
        .in('skill', requiredSkills)

    if (agentPool && agentPool.length > 0) {
        query = query.in('agent_id', agentPool)
    }

    const { data: matches } = await query

    if (!matches || matches.length === 0) {
        // No skilled agents, fallback to load balance
        return await loadBalanceAssignment(orgId, agentPool, channelType, connectionId)
    }

    // Group by agent and calculate total proficiency score
    const agentScores = matches.reduce((acc, m) => {
        if (!acc[m.agent_id]) acc[m.agent_id] = 0
        acc[m.agent_id] += m.proficiency
        return acc
    }, {} as Record<string, number>)

    // Sort by score
    const sortedAgents = Object.entries(agentScores)
        .sort(([, a], [, b]) => b - a)
        .map(([agentId]) => agentId)

    // Check availability and CHANNEL ACCESS of top agents
    // Fetch roles for bypass
    const { data: members } = await supabaseAdmin
        .from('organization_members')
        .select('user_id, role, permissions')
        .in('user_id', sortedAgents)

    const memberMap = new Map((members || []).map(m => [m.user_id, m]));

    const heartbeatThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    for (const agentId of sortedAgents) {
        const member = memberMap.get(agentId);
        const isAdmin = ['admin', 'owner'].includes(member?.role?.toLowerCase());

        // Validation: Channel Access (Skip if Admin)
        if (channelType && !isAdmin) {
            const hasExplicitAccess = (member?.permissions as any)?.inbox_access?.includes(connectionId);
            
            if (!hasExplicitAccess) {
                const { data: hasAccess } = await supabaseAdmin
                    .from('agent_channels')
                    .select('agent_id')
                    .eq('agent_id', agentId)
                    .or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`)
                    .eq('is_active', true)
                    .limit(1)

                if (!hasAccess || hasAccess.length === 0) continue;
            }
        }

        const { data: availability } = await supabaseAdmin
            .from('agent_availability')
            .select('agent_id, current_load, max_capacity, last_seen_at')
            .eq('agent_id', agentId)
            .eq('status', 'online')
            .eq('auto_assign_enabled', true)
            .single()

        // Check load AND heartbeat
        if (availability && 
            availability.current_load < availability.max_capacity &&
            availability.last_seen_at && availability.last_seen_at > heartbeatThreshold
        ) {
            return availability.agent_id
        }
    }

    return null
}

export async function logAssignment(convId: string, agentId: string, ruleId: string | null, method: string, orgId: string) {
    const { error } = await supabaseAdmin
        .from('assignment_history')
        .insert({
            organization_id: orgId,
            conversation_id: convId,
            assigned_to: agentId,
            assignment_method: method,
            rule_id: ruleId
        })

    if (error) {
        // CRITICAL: Ensure organization_id is logged. Missing this ID broke rotation in previous versions.
        console.error('[AssignmentEngine] ❌ Failed to log assignment history (Required for rotation):', error.message, { convId, agentId, method, orgId })
    }
}

/**
 * Reconcile an agent's current_load with actual active assigned conversations.
 * Call this if load counts drift out of sync.
 */
export async function reconcileAgentLoad(agentId: string): Promise<{ previous: number; actual: number }> {
    const { count } = await supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', agentId)
        .in('state', ['active'])
        .in('status', ['open', 'snoozed'])

    const actualLoad = count || 0

    const { data: agent } = await supabaseAdmin
        .from('agent_availability')
        .select('current_load')
        .eq('agent_id', agentId)
        .single()

    const previousLoad = agent?.current_load || 0

    if (previousLoad !== actualLoad) {
        await supabaseAdmin
            .from('agent_availability')
            .update({ current_load: actualLoad })
            .eq('agent_id', agentId)
        console.log(`[AssignmentEngine] Reconciled load for ${agentId}: ${previousLoad} → ${actualLoad}`)
    }

    return { previous: previousLoad, actual: actualLoad }
}
