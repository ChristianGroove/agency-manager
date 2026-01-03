"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { assignConversation as autoAssignConversation } from "./assignment-engine"
import { revalidatePath } from "next/cache"

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

    // Use Admin Client to bypass RLS for reading (since RLS on SELECT seems flaky)
    // We enforce security by manually filtering by organization_id
    // REMOVED JOIN with auth.users because it's not exposed in PostgREST and causes failure
    const { data, error } = await supabaseAdmin
        .from('agent_availability')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .order('status', { ascending: false })

    if (error) {
        console.error('Failed to fetch agents workload:', error)
        return { success: false, error: error.message, data: [] }
    }

    // Attempt to map users manually since we can't join with auth.users directly
    const agentsWithUsers = await Promise.all(data.map(async (agent) => {
        try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(agent.agent_id)
            if (userError || !userData?.user) {
                return {
                    ...agent,
                    users: { email: 'Unknown', raw_user_meta_data: { name: 'Unknown Agent' } }
                }
            }
            return {
                ...agent,
                users: {
                    email: userData.user.email,
                    raw_user_meta_data: userData.user.user_metadata
                }
            }
        } catch (e) {
            return {
                ...agent,
                users: { email: 'Unknown', raw_user_meta_data: { name: 'Unknown Agent' } }
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
