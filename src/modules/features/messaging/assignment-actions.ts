"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { assignConversation as autoAssignConversation, logAssignment } from "./assignment-engine"
import { AGENT_MAX_CAPACITY, AGENT_MIN_CAPACITY, DEFAULT_AGENT_CAPACITY } from "./assignment-constants"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_ASSIGNMENT_ACTION_ERROR = 'Assignment action failed'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function sanitizeAssignmentActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'agentId',
        'connectionId',
        'conversationId',
        'organizationId',
        'ruleId',
        'userId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (key === 'targetConnectionIds' && Array.isArray(value)) {
                return ['targetConnectionIdsCount', value.length]
            }

            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeAssignmentActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        }
    }

    return { type: typeof error }
}

function logAssignmentActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...sanitizeAssignmentActionLogDetails(details),
        detail: summarizeAssignmentActionError(error),
    })
}

function logAssignmentActionInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeAssignmentActionLogDetails(details))
}

function publicAssignmentActionError(error: unknown, fallback = PUBLIC_ASSIGNMENT_ACTION_ERROR) {
    if (isDeployedRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
            return message
        }
    }

    if (typeof error === 'string' && error.length > 0) {
        return error
    }

    return fallback
}

/**
 * Update agent's online status and availability
 */
export async function updateAgentStatus(status: 'online' | 'away' | 'offline' | 'busy') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get organization_id from members table to match RLS policy source of truth
    const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!memberData) {
        console.error('No organization membership found for user')
        return { success: false, error: 'Organization membership not found' }
    }

    // Update if exists, insert if new agent
    // IMPORTANT: Use update first to avoid overwriting auto_assign_enabled and max_capacity
    const { data: existing } = await supabaseAdmin
        .from('agent_availability')
        .select('agent_id')
        .eq('organization_id', memberData.organization_id)
        .eq('agent_id', user.id)
        .maybeSingle()

    if (existing) {
        // Update only the status field (preserve other settings)
        const { error } = await supabaseAdmin
            .from('agent_availability')
            .update({
                status,
                last_seen_at: new Date().toISOString()
            })
            .eq('agent_id', user.id)
            .eq('organization_id', memberData.organization_id)

        if (error) {
            logAssignmentActionError('Failed to update agent status:', error, {
                userId: user.id,
                organizationId: memberData.organization_id,
                status,
            })
            return { success: false, error: publicAssignmentActionError(error) }
        }
    } else {
        // Insert new agent with sensible defaults
        const { error } = await supabaseAdmin
            .from('agent_availability')
            .insert({
                organization_id: memberData.organization_id,
                agent_id: user.id,
                status,
                max_capacity: DEFAULT_AGENT_CAPACITY,
                current_load: 0,
                auto_assign_enabled: true, // Enable by default (matches DB schema default)
                last_seen_at: new Date().toISOString()
            })

        if (error) {
            logAssignmentActionError('Failed to insert agent availability:', error, {
                userId: user.id,
                organizationId: memberData.organization_id,
                status,
            })
            return { success: false, error: publicAssignmentActionError(error) }
        }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Toggle auto-assign for current agent
 */
export async function toggleAutoAssign(enabled: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get organization_id from members table to match RLS policy source of truth
    const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!memberData) {
        return { success: false, error: 'Organization membership not found' }
    }

    const { error } = await supabase
        .from('agent_availability')
        .upsert({
            organization_id: memberData.organization_id,
            agent_id: user.id,
            auto_assign_enabled: enabled,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id,agent_id',
            ignoreDuplicates: false // Upsert
        })

    if (error) {
        return { success: false, error: publicAssignmentActionError(error) }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Update agent's max capacity
 */
export async function updateAgentCapacity(maxCapacity: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const normalizedCapacity = Math.trunc(Number(maxCapacity))
    if (
        !Number.isFinite(normalizedCapacity) ||
        normalizedCapacity < AGENT_MIN_CAPACITY ||
        normalizedCapacity > AGENT_MAX_CAPACITY
    ) {
        return {
            success: false,
            error: `Capacidad invalida. Debe estar entre ${AGENT_MIN_CAPACITY} y ${AGENT_MAX_CAPACITY}.`
        }
    }

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get organization_id from members table to match RLS policy source of truth
    const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!memberData) {
        return { success: false, error: 'Organization membership not found' }
    }

    const { error } = await supabase
        .from('agent_availability')
        .upsert({
            organization_id: memberData.organization_id,
            agent_id: user.id,
            max_capacity: normalizedCapacity,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id,agent_id',
            ignoreDuplicates: false // Upsert
        })

    if (error) {
        return { success: false, error: publicAssignmentActionError(error) }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Get all agents with their availability and workload
 */
export async function getAgentsWorkload() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    // Get organization_id for security context
    const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!memberData) {
        return { success: false, error: 'No organization found', data: [] }
    }

    // Fetch availability with channels, and members separately to avoid complex joins across schemas
    const [availabilityResult, membersResult] = await Promise.all([
        supabaseAdmin
            .from('agent_availability')
            .select('*, agent_channels(channel_type)')
            .eq('organization_id', memberData.organization_id)
            .order('status', { ascending: false }),
        supabaseAdmin
            .from('organization_members')
            .select('user_id, role, permissions')
            .eq('organization_id', memberData.organization_id)
    ])

    if (availabilityResult.error) {
        logAssignmentActionError('Failed to fetch agents workload:', availabilityResult.error, {
            organizationId: memberData.organization_id,
        })
        return { success: false, error: publicAssignmentActionError(availabilityResult.error), data: [] }
    }

    const membersLookup = new Map((membersResult.data || []).map(m => [m.user_id, { role: m.role, permissions: m.permissions }]));

    // Only include agents who are active members of the organization
    const activeAgents = availabilityResult.data.filter(agent => membersLookup.has(agent.agent_id));

    // 2. Get profiles for names and avatars
    console.time('agents:profiles_fetch')
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', activeAgents.map(a => a.agent_id))
    console.timeEnd('agents:profiles_fetch')

    if (profileError) {
        logAssignmentActionError('Error fetching agent profiles:', profileError, {
            organizationId: memberData.organization_id,
            agentsCount: activeAgents.length,
        })
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    // Debug log
    console.log(`[Inbox] Agentes activos: ${activeAgents.length}, Perfiles encontrados: ${profiles?.length || 0}`)
    if (activeAgents.length > 0 && (!profiles || profiles.length === 0)) {
        console.warn('[Inbox] ¡Atención! Se encontraron agentes activos pero NINGÚN perfil coincidente en la tabla profiles.')
    }

    // Assemble agents with their loaded data
    const agentsWithUsers = activeAgents.map((agent) => {
        const profile = profileMap.get(agent.agent_id)
        const memberInfo = membersLookup.get(agent.agent_id) || { role: 'member', permissions: {} }
        
        return {
            ...agent,
            role: memberInfo.role,
            permissions: memberInfo.permissions,
            users: {
                email: 'N/A', // Email usually in auth.users, keeping N/A to avoid Auth API waterfalls
                raw_user_meta_data: {
                    name: profile?.full_name || 'Agente',
                    avatar_url: profile?.avatar_url
                }
            }
        }
    })

    console.timeEnd('agents:total_load')
    return { success: true, data: agentsWithUsers }
}

/**
 * Manually trigger auto-assignment for a conversation
 */
export async function triggerAutoAssignment(conversationId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization found' }

    const supabase = await createClient()
    const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('organization_id', orgId)
        .single()

    if (!conversation) {
        return { success: false, error: 'Conversation not found' }
    }

    const agentId = await autoAssignConversation(conversationId)

    if (!agentId) {
        return { success: false, error: 'No available agent found' }
    }

    revalidatePath('/inbox')
    return { success: true, agentId }
}

/**
 * Create or update an assignment rule
 */
export async function upsertAssignmentRule(rule: {
    id?: string
    name: string
    description?: string
    priority: number
    conditions: any
    strategy: string
    assign_to?: string[]
    is_active?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        console.error('[upsertAssignmentRule] No organization found')
        return { success: false, error: 'Organization not found' }
    }

    const ruleData: any = {
        name: rule.name,
        priority: rule.priority,
        conditions: rule.conditions,
        strategy: rule.strategy,
        assign_to: rule.assign_to || [],
        is_active: rule.is_active !== undefined ? rule.is_active : true,
        organization_id: orgId,
        updated_at: new Date().toISOString()
    }

    // If updating existing rule, include ID
    if (rule.id) {
        ruleData.id = rule.id
    }

    const { data, error } = await supabaseAdmin
        .from('assignment_rules')
        .upsert(ruleData)
        .select()
        .single()

    if (error) {
        logAssignmentActionError('[upsertAssignmentRule] Failed:', error, {
            organizationId: orgId,
            ruleId: rule.id,
            userId: user.id,
            strategy: rule.strategy,
        })
        return { success: false, error: publicAssignmentActionError(error) }
    }

    logAssignmentActionInfo('[upsertAssignmentRule] Saved rule', {
        ruleId: data.id,
        strategy: data.strategy,
    })
    revalidatePath('/inbox/settings')
    revalidatePath('/crm/settings/channels')
    return { success: true, data }
}

/**
 * Delete an assignment rule
 */
export async function deleteAssignmentRule(ruleId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization found' }

    const { error } = await supabaseAdmin
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId)
        .eq('organization_id', orgId)

    if (error) {
        logAssignmentActionError('[deleteAssignmentRule] Failed:', error, { ruleId, organizationId: orgId })
        return { success: false, error: publicAssignmentActionError(error) }
    }

    revalidatePath('/inbox/settings')
    revalidatePath('/crm/settings/channels')
    return { success: true }
}

/**
 * Toggle assignment rule active status
 */
export async function toggleAssignmentRule(ruleId: string, isActive: boolean) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization found' }

    const supabase = await createClient()

    const { error } = await supabase
        .from('assignment_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId)
        .eq('organization_id', orgId)

    if (error) {
        logAssignmentActionError('[toggleAssignmentRule] Failed:', error, { ruleId, organizationId: orgId })
        return { success: false, error: publicAssignmentActionError(error) }
    }

    revalidatePath('/inbox/settings')
    return { success: true }
}

/**
 * Add/update agent skills
 */
export async function updateAgentSkills(skills: Array<{ skill: string; proficiency: number }>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Delete existing skills
    await supabase
        .from('agent_skills')
        .delete()
        .eq('agent_id', user.id)

    // Insert new skills
    const skillsData = skills.map(s => ({
        agent_id: user.id,
        skill: s.skill,
        proficiency: s.proficiency
    }))

    const { error } = await supabase
        .from('agent_skills')
        .insert(skillsData)

    if (error) {
        logAssignmentActionError('Failed to update agent skills:', error, {
            userId: user.id,
            skillsCount: skills.length,
        })
        return { success: false, error: publicAssignmentActionError(error) }
    }

    return { success: true }
}

/**
 * Get assignment rule specifically for a channel connection
 */
export async function getChannelAssignmentRule(connectionId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    // We search for a rule where conditions->'connection_id' contains the ID
    // Note: this assumes one specific rule per channel
    const { data, error } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', orgId)
        .contains('conditions', { connection_id: [connectionId] })
        .single()

    if (error) {
        if (error.code !== 'PGRST116') { // Not found code
            logAssignmentActionError('Error fetching channel rule:', error, { connectionId, organizationId: orgId })
        }
        return null
    }

    return data
}
/**
 * Get all assignment rules for the current organization
 */
export async function getAssignmentRules() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: 'No organization found', data: [] }

    const { data, error } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', orgId)
        .order('priority', { ascending: true })

    if (error) {
        logAssignmentActionError('[getAssignmentRules] Failed:', error, { organizationId: orgId })
        return { success: false, error: publicAssignmentActionError(error), data: [] }
    }

    return { success: true, data }
}

/**
 * Lightweight action to get agents for the inbox sidebar filter
 * Crosses organization_members, profiles, and agent_channels in 3 fast queries without hitting Auth API limits.
 */
export async function getSidebarAgents() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!memberData) {
        return { success: false, error: 'No organization found', data: [] }
    }

    // 1. Get all members of the organization
    const { data: members, error: membersError } = await supabaseAdmin
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', memberData.organization_id)

    if (membersError || !members) {
        if (membersError) {
            logAssignmentActionError('[getSidebarAgents] Failed to fetch members:', membersError, {
                organizationId: memberData.organization_id,
            })
        }
        return { success: false, error: publicAssignmentActionError(membersError, 'Error fetching members'), data: [] }
    }

    const userIds = members.map(m => m.user_id)

    // 2. Get profiles for names, avatars, and platform roles (to filter super_admins)
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url, platform_role')
        .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
    const platformAdminIds = new Set(
        profiles?.filter(p => p.platform_role === 'super_admin').map(p => p.id) || []
    )

    // 3. Get channel access from agent_availability
    const { data: availability } = await supabaseAdmin
        .from('agent_availability')
        .select('agent_id, agent_channels(channel_type)')
        .eq('organization_id', memberData.organization_id)
        .in('agent_id', userIds)

    const channelsMap = new Map((availability || []).map(a => [a.agent_id, a.agent_channels?.map((c: any) => c.channel_type) || []]))

    // 4. Assemble payload and filter out platform admins
    const agents = members
        .filter(m => !platformAdminIds.has(m.user_id))
        .map(m => {
            const profile = profileMap.get(m.user_id)
            return {
                id: m.user_id,
                name: profile?.full_name || 'Agente', // Fast local fallback instead of auth fetch
                avatar_url: profile?.avatar_url || null,
                role: m.role,
                channels: channelsMap.get(m.user_id) || []
            }
        })

    // Sort alphabetically
    agents.sort((a, b) => a.name.localeCompare(b.name))

    return { success: true, data: agents }
}

/**
 * Reconcile current_load for all agents in the organization
 * Counts actual active assigned conversations vs stored counter
 */
export async function reconcileAllAgentLoads() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization found' }

    const { reconcileAgentLoad } = await import('./assignment-engine')

    const { data: agents } = await supabaseAdmin
        .from('agent_availability')
        .select('agent_id')
        .eq('organization_id', orgId)

    if (!agents || agents.length === 0) return { success: true, data: [] }

    const results = await Promise.all(
        agents.map(a => reconcileAgentLoad(a.agent_id))
    )

    const fixed = results.filter(r => r.previous !== r.actual)
    return { success: true, data: { total: agents.length, reconciled: fixed.length } }
}

/**
 * Distribute all unassigned conversations equitably among online agents
 * using a channel-aware Round Robin algorithm.
 */
/**
 * Distribute unassigned conversations equitably among online agents.
 * @param targetConnectionIds Optional array of connection IDs to limit distribution.
 */
export async function distributeUnassignedConversations(targetConnectionIds?: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization found' }

    // 1. Fetch unassigned conversations
    let convQuery = supabaseAdmin
        .from('conversations')
        .select('id, channel, connection_id')
        .eq('organization_id', orgId)
        .is('assigned_to', null)
        .eq('state', 'active')
        .eq('status', 'open')

    if (targetConnectionIds && targetConnectionIds.length > 0) {
        convQuery = convQuery.in('connection_id', targetConnectionIds)
    }

    const { data: unassigned, error: convError } = await convQuery

    if (convError) {
        logAssignmentActionError('[distributeUnassignedConversations] Failed to fetch conversations:', convError, {
            organizationId: orgId,
            targetConnectionIds,
        })
        return { success: false, error: publicAssignmentActionError(convError) }
    }
    if (!unassigned || unassigned.length === 0) return { success: true, count: 0, message: 'No unassigned conversations' }

    // 2. Fetch online agents with heartbeat validation (3 minutes threshold)
    const heartbeatThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    const { data: agents, error: agentError } = await supabaseAdmin
        .from('agent_availability')
        .select('agent_id, organization_id, last_seen_at')
        .eq('organization_id', orgId)
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)
        .gt('last_seen_at', heartbeatThreshold)

    if (agentError) {
        logAssignmentActionError('[distributeUnassignedConversations] Failed to fetch agents:', agentError, {
            organizationId: orgId,
            targetConnectionIds,
        })
        return { success: false, error: publicAssignmentActionError(agentError) }
    }
    if (!agents || agents.length === 0) return { success: false, error: 'No online agents available' }

    const agentIds = agents.map(a => a.agent_id)

    // 3. Get roles and channel access for these agents
    const [rolesResult, accessResult] = await Promise.all([
        supabaseAdmin.from('organization_members').select('user_id, role, permissions').eq('organization_id', orgId).in('user_id', agentIds),
        supabaseAdmin.from('agent_channels').select('agent_id, channel_type').eq('is_active', true).in('agent_id', agentIds)
    ])

    const membersMap = new Map((rolesResult.data || []).map(m => [m.user_id, m]))
    const channelAccessMap = (accessResult.data || []).reduce((acc: any, curr) => {
        if (!acc[curr.agent_id]) acc[curr.agent_id] = new Set()
        acc[curr.agent_id].add(curr.channel_type)
        return acc
    }, {})

    // 4. Group conversations by connection_id for targeted distribution
    const groups: Record<string, typeof unassigned> = {}
    unassigned.forEach(c => {
        const key = c.connection_id || c.channel
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
    })

    let totalDistributed = 0
    const assignmentPromises: Promise<any>[] = []

    // 5. Apply Round Robin per Group
    for (const [connectionId, groupChats] of Object.entries(groups)) {
        // Filter agents qualified for THIS channel
        const qualifiedAgents = agents.filter(a => {
            const member = membersMap.get(a.agent_id)
            const isAdmin = ['admin', 'owner'].includes(member?.role?.toLowerCase())
            const hasChannelBinding = channelAccessMap[a.agent_id]?.has(connectionId) || channelAccessMap[a.agent_id]?.has(groupChats[0].channel)
            const hasExplicitAccess = (member?.permissions as any)?.inbox_access?.includes(connectionId)
            return isAdmin || hasChannelBinding || hasExplicitAccess
        })

        if (qualifiedAgents.length === 0) continue

        // Distribute chats in this group
        groupChats.forEach((chat, index) => {
            const agent = qualifiedAgents[index % qualifiedAgents.length]
            
            // Push update promise - Wrapped in async to ensure correct Promise type
            assignmentPromises.push((async () => {
                const { error: updateError } = await supabaseAdmin
                    .from('conversations')
                    .update({ assigned_to: agent.agent_id, updated_at: new Date().toISOString() })
                    .eq('id', chat.id)
                    .eq('organization_id', orgId)
                
                if (!updateError) {
                    await logAssignment(chat.id, agent.agent_id, null, 'round-robin-bulk', orgId)
                } else {
                    logAssignmentActionError('[distributeUnassignedConversations] Failed to assign conversation:', updateError, {
                        agentId: agent.agent_id,
                        conversationId: chat.id,
                        organizationId: orgId,
                    })
                }
            })())
            totalDistributed++
        })
    }

    if (totalDistributed > 0) {
        await Promise.all(assignmentPromises)
        revalidatePath('/inbox')
    }

    return { success: true, count: totalDistributed }
}

/**
 * Get statistics of unassigned conversations grouped by channel connection
 */
export async function getUnassignedDistributionStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, data: [] }

    // 1. Fetch unassigned conversations summary
    const { data: convs, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('connection_id, channel')
        .eq('organization_id', orgId)
        .is('assigned_to', null)
        .eq('state', 'active')
        .eq('status', 'open')

    if (convError || !convs) {
        if (convError) {
            logAssignmentActionError('[getUnassignedDistributionStats] Failed to fetch conversations:', convError, {
                organizationId: orgId,
            })
        }
        return { success: false, error: publicAssignmentActionError(convError), data: [] }
    }

    const { data: connections, error: connError } = await supabaseAdmin
        .from('integration_connections')
        .select('id, connection_name, provider_key')
        .eq('organization_id', orgId)

    if (connError) {
        logAssignmentActionError('[getUnassignedDistributionStats] Failed to fetch connections:', connError, {
            organizationId: orgId,
        })
        return { success: false, error: publicAssignmentActionError(connError), data: [] }
    }

    const connMap = new Map(connections?.map(c => [c.id, c]) || [])

    // 3. Group and count
    const statsMap: Record<string, { id: string, name: string, type: string, count: number }> = {}

    const getFriendlyType = (key: string) => {
        const k = key.toLowerCase();
        if (k.includes('whatsapp')) return 'WhatsApp';
        if (k.includes('instagram')) return 'Instagram';
        if (k.includes('messenger') || k.includes('facebook')) return 'Messenger';
        if (k.includes('evolution')) return 'WhatsApp (API)';
        return key;
    }

    convs.forEach(c => {
        const id = c.connection_id || 'unknown'
        if (!statsMap[id]) {
            const conn = connMap.get(id)
            const typeKey = conn?.provider_key || c.channel || 'chat'
            statsMap[id] = {
                id,
                name: conn?.connection_name || 'General',
                type: getFriendlyType(typeKey),
                count: 0
            }
        }
        statsMap[id].count++
    })

    const data = Object.values(statsMap).sort((a, b) => b.count - a.count)
    return { success: true, data }
}

