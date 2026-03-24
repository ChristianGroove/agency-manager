"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Main entry point: Find best agent for a conversation
 * Called automatically by WebhookManager after saving a message
 */
export async function assignConversation(conversationId: string, metadata?: any): Promise<string | null> {

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

    // 3. Find matching assignment rule (by priority)
    const rule = await findMatchingRule(conv)
    const orgId = conv.organization_id

    if (!rule) {
        // Fallback: use load-balance across all org agents
        return await loadBalanceAssignment(orgId, undefined, conv.channel, conv.connection_id)
    }

    // 4. Execute strategy
    const agentId = await executeStrategy(rule, conv)

    // 5. Update conversation & log
    // NOTE: DB trigger `trigger_update_agent_load` handles incrementing/decrementing
    //       agent load automatically when `assigned_to` changes.
    if (agentId) {
        await supabaseAdmin
            .from('conversations')
            .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
            .eq('id', conversationId)

        await logAssignment(conversationId, agentId, rule.id, 'auto-rule')
        console.log(`[AssignmentEngine] ✅ Assigned to agent: ${agentId} via rule: ${rule.name}`)
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
            return await roundRobinAssignment(orgId, rule.assign_to, conv.channel, conv.connection_id)
        case 'load-balance':
            return await loadBalanceAssignment(orgId, rule.assign_to, conv.channel, conv.connection_id)
        case 'skills-based':
            return await skillsBasedAssignment(conv, rule.assign_to, conv.channel, conv.connection_id)
        case 'specific-agent':
            return rule.assign_to?.[0] || null
        default:
            return null
    }
}

async function roundRobinAssignment(orgId: string, agentPool?: string[], channelType?: string, connectionId?: string): Promise<string | null> {
    // Get last assigned agent from this pool (scoped to organization)
    let lastQuery = supabaseAdmin
        .from('assignment_history')
        .select('assigned_to, conversations!inner(organization_id)')
        .eq('conversations.organization_id', orgId)
        .eq('assignment_method', 'round-robin')
        .order('created_at', { ascending: false })
        .limit(1)

    if (agentPool && agentPool.length > 0) {
        lastQuery = lastQuery.in('assigned_to', agentPool)
    }

    const { data: lastAssignment } = await lastQuery.maybeSingle()

    // Get available agents (scoped to org)
    let agentQuery = supabaseAdmin
        .from('agent_availability')
        .select('agent_id, organization_id')
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)
        .eq('organization_id', orgId)

    if (agentPool && agentPool.length > 0) {
        agentQuery = agentQuery.in('agent_id', agentPool)
    }

    const { data: agents } = await agentQuery

    if (!agents || agents.length === 0) return null

    // Filter by Channel Access AND Admin Role
    const [rolesResult, accessResult] = await Promise.all([
        supabaseAdmin.from('organization_members').select('user_id, role').eq('organization_id', orgId).in('user_id', agents.map(a => a.agent_id)),
        channelType ? supabaseAdmin.from('agent_channels').select('agent_id').or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`).eq('is_active', true) : Promise.resolve({ data: [] })
    ]);

    const adminUserIds = new Set((rolesResult.data || []).filter(m => ['admin', 'owner'].includes(m.role?.toLowerCase())).map(m => m.user_id));
    const authorizedAgentIds = new Set((accessResult.data || []).map(ca => ca.agent_id));

    const qualifiedAgents = agents.filter(a => adminUserIds.has(a.agent_id) || authorizedAgentIds.has(a.agent_id));

    if (qualifiedAgents.length === 0) return null;

    // Find next agent in rotation
    const lastIndex = qualifiedAgents.findIndex(a => a.agent_id === lastAssignment?.assigned_to)
    const nextIndex = (lastIndex + 1) % qualifiedAgents.length
    return qualifiedAgents[nextIndex].agent_id
}

async function loadBalanceAssignment(orgId: string, agentPool?: string[], channelType?: string, connectionId?: string): Promise<string | null> {
    // 1. Get online agents with capacity (scoped to org)
    let query = supabaseAdmin
        .from('agent_availability')
        .select('agent_id, current_load, max_capacity, status, organization_id')
        .eq('organization_id', orgId)
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)

    if (agentPool && agentPool.length > 0) {
        query = query.in('agent_id', agentPool)
    }

    const { data: agents } = await query

    if (!agents || agents.length === 0) return null

    // 2. Filter by Channel Access AND Admin Role
    const [rolesResult, accessResult] = await Promise.all([
        supabaseAdmin.from('organization_members').select('user_id, role').eq('organization_id', orgId).in('user_id', agents.map(a => a.agent_id)),
        channelType ? supabaseAdmin.from('agent_channels').select('agent_id').or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`).eq('is_active', true) : Promise.resolve({ data: [] })
    ]);

    const adminUserIds = new Set((rolesResult.data || []).filter(m => ['admin', 'owner'].includes(m.role?.toLowerCase())).map(m => m.user_id));
    const authorizedAgentIds = new Set((accessResult.data || []).map(ca => ca.agent_id));

    const qualifiedAgents = agents.filter(a => adminUserIds.has(a.agent_id) || authorizedAgentIds.has(a.agent_id));

    if (qualifiedAgents.length === 0) return null;

    // 3. Find agent with lowest load percentage
    const sorted = qualifiedAgents
        .filter(a => a.current_load < a.max_capacity)
        .map(a => ({
            ...a,
            loadPercentage: (a.current_load / a.max_capacity) * 100
        }))
        .sort((a, b) => a.loadPercentage - b.loadPercentage)

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
        .select('user_id, role')
        .in('user_id', sortedAgents)

    const adminUserIds = new Set((members || []).filter(m => ['admin', 'owner'].includes(m.role?.toLowerCase())).map(m => m.user_id));

    for (const agentId of sortedAgents) {
        const isAdmin = adminUserIds.has(agentId)

        // Validation: Channel Access (Skip if Admin)
        if (channelType && !isAdmin) {
            const { data: hasAccess } = await supabaseAdmin
                .from('agent_channels')
                .select('agent_id')
                .eq('agent_id', agentId)
                .or(`channel_type.eq.${channelType},channel_type.eq.${connectionId}`)
                .eq('is_active', true)
                .limit(1)

            if (!hasAccess || hasAccess.length === 0) continue;
        }

        const { data: availability } = await supabaseAdmin
            .from('agent_availability')
            .select('agent_id, current_load, max_capacity')
            .eq('agent_id', agentId)
            .eq('status', 'online')
            .eq('auto_assign_enabled', true)
            .single()

        if (availability && availability.current_load < availability.max_capacity) {
            return availability.agent_id
        }
    }

    return null
}

async function logAssignment(convId: string, agentId: string, ruleId: string | null, method: string) {
    await supabaseAdmin
        .from('assignment_history')
        .insert({
            conversation_id: convId,
            assigned_to: agentId,
            assignment_method: method,
            rule_id: ruleId
        })
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
