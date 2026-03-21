"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { assignConversation as autoAssignConversation } from "./assignment-engine"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

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

    const { error } = await supabase
        .from('agent_availability')
        .upsert({
            organization_id: memberData.organization_id,
            agent_id: user.id,
            status,
            // Initialize defaults if creating new
            max_capacity: 5,
            current_load: 0,
            auto_assign_enabled: false,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id,agent_id',
            ignoreDuplicates: false // Upsert
        })

    if (error) {
        console.error('Failed to update agent status:', error)
        return { success: false, error: error.message }
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
        return { success: false, error: error.message }
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
            max_capacity: maxCapacity,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id,agent_id',
            ignoreDuplicates: false // Upsert
        })

    if (error) {
        return { success: false, error: error.message }
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
            .select('user_id, role')
            .eq('organization_id', memberData.organization_id)
    ])

    if (availabilityResult.error) {
        console.error('Failed to fetch agents workload:', availabilityResult.error)
        return { success: false, error: availabilityResult.error.message, data: [] }
    }

    const membersLookup = new Map((membersResult.data || []).map(m => [m.user_id, m.role]));

    // Only include agents who are active members of the organization
    const activeAgents = availabilityResult.data.filter(agent => membersLookup.has(agent.agent_id));

    // Fetch profiles to get full names
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', activeAgents.map(a => a.agent_id))

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Attempt to map users manually since we can't join with auth.users directly
    const agentsWithUsers = await Promise.all(activeAgents.map(async (agent) => {
        try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(agent.agent_id)
            const role = membersLookup.get(agent.agent_id) || 'member';
            const profile = profileMap.get(agent.agent_id)

            if (userError || !userData?.user) {
                return {
                    ...agent,
                    role,
                    users: { 
                        email: 'Unknown', 
                        raw_user_meta_data: { 
                            name: profile?.full_name || 'Unknown Agent' 
                        } 
                    }
                }
            }
            return {
                ...agent,
                role,
                users: {
                    email: userData.user.email,
                    raw_user_meta_data: {
                        ...userData.user.user_metadata,
                        name: profile?.full_name || userData.user.user_metadata?.name || userData.user.email
                    }
                }
            }
        } catch (e) {
            const profile = profileMap.get(agent.agent_id)
            return {
                ...agent,
                role: membersLookup.get(agent.agent_id) || 'member',
                users: { 
                    email: 'Unknown', 
                    raw_user_meta_data: { 
                        name: profile?.full_name || 'Unknown Agent' 
                    } 
                }
            }
        }
    }))

    return { success: true, data: agentsWithUsers }
}

/**
 * Manually trigger auto-assignment for a conversation
 */
export async function triggerAutoAssignment(conversationId: string) {
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
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Get organization_id
    const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

    if (!org) {
        return { success: false, error: 'Organization not found' }
    }

    const ruleData = {
        ...rule,
        organization_id: org.id,
        created_by: user.id,
        updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
        .from('assignment_rules')
        .upsert(ruleData)
        .select()
        .single()

    if (error) {
        console.error('Failed to upsert assignment rule:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox/settings')
    return { success: true, data }
}

/**
 * Delete an assignment rule
 */
export async function deleteAssignmentRule(ruleId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox/settings')
    return { success: true }
}

/**
 * Toggle assignment rule active status
 */
export async function toggleAssignmentRule(ruleId: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('assignment_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId)

    if (error) {
        return { success: false, error: error.message }
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
        console.error('Failed to update agent skills:', error)
        return { success: false, error: error.message }
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
            console.error('Error fetching channel rule:', error)
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
        return { success: false, error: error.message, data: [] }
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
        return { success: false, error: membersError?.message || 'Error fetching members', data: [] }
    }

    const userIds = members.map(m => m.user_id)

    // 2. Get profiles for names and avatars
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // 3. Get channel access from agent_availability
    const { data: availability } = await supabaseAdmin
        .from('agent_availability')
        .select('agent_id, agent_channels(channel_type)')
        .eq('organization_id', memberData.organization_id)
        .in('agent_id', userIds)

    const channelsMap = new Map((availability || []).map(a => [a.agent_id, a.agent_channels?.map((c: any) => c.channel_type) || []]))

    // 4. Assemble payload
    const agents = members.map(m => {
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

