"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Main entry point: Find best agent for a conversation
 */
export async function assignConversation(conversationId: string, metadata?: any): Promise<string | null> {
    console.log(`[AssignmentEngine] 🎯 Starting assignment for conversation: ${conversationId}`)

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
    if (conv.assigned_to) {
        console.log(`[AssignmentEngine] Already assigned to: ${conv.assigned_to}`)
        return conv.assigned_to
    }

    // 3. Find matching assignment rule (by priority)
    const rule = await findMatchingRule(conv)

    if (!rule) {
        console.log('[AssignmentEngine] No matching rule found, using default load-balance')
        return await loadBalanceAssignment()
    }

    console.log(`[AssignmentEngine] Matched rule: ${rule.name} (strategy: ${rule.strategy})`)

    // 4. Execute strategy
    const agentId = await executeStrategy(rule, conv)

    // 5. Update conversation & log
    if (agentId) {
        await supabaseAdmin
            .from('conversations')
            .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
            .eq('id', conversationId)

        await logAssignment(conversationId, agentId, rule.id, 'auto-rule')
        await incrementAgentLoad(agentId)

        console.log(`[AssignmentEngine] ✅ Assigned to agent: ${agentId}`)
    } else {
        console.log('[AssignmentEngine] ❌ No available agent found')
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
    switch (rule.strategy) {
        case 'round-robin':
            return await roundRobinAssignment(rule.assign_to)
        case 'load-balance':
            return await loadBalanceAssignment(rule.assign_to)
        case 'skills-based':
            return await skillsBasedAssignment(conv, rule.assign_to)
        case 'specific-agent':
            return rule.assign_to?.[0] || null
        default:
            console.error(`[AssignmentEngine] Unknown strategy: ${rule.strategy}`)
            return null
    }
}

async function roundRobinAssignment(agentPool?: string[]): Promise<string | null> {
    // Get last assigned agent from this pool
    let lastQuery = supabaseAdmin
        .from('assignment_history')
        .select('assigned_to')
        .eq('assignment_method', 'round-robin')
        .order('created_at', { ascending: false })
        .limit(1)

    if (agentPool && agentPool.length > 0) {
        lastQuery = lastQuery.in('assigned_to', agentPool)
    }

    const { data: lastAssignment } = await lastQuery.single()

    // Get available agents
    let agentQuery = supabaseAdmin
        .from('agent_availability')
        .select('agent_id')
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)

    if (agentPool && agentPool.length > 0) {
        agentQuery = agentQuery.in('agent_id', agentPool)
    }

    const { data: agents } = await agentQuery

    if (!agents || agents.length === 0) return null

    // Find next agent in rotation
    const lastIndex = agents.findIndex(a => a.agent_id === lastAssignment?.assigned_to)
    const nextIndex = (lastIndex + 1) % agents.length
    return agents[nextIndex].agent_id
}

async function loadBalanceAssignment(agentPool?: string[]): Promise<string | null> {
    let query = supabaseAdmin
        .from('agent_availability')
        .select('agent_id, current_load, max_capacity, status')
        .eq('status', 'online')
        .eq('auto_assign_enabled', true)

    if (agentPool && agentPool.length > 0) {
        query = query.in('agent_id', agentPool)
    }

    const { data: agents } = await query

    if (!agents || agents.length === 0) return null

    // Find agent with lowest load percentage
    const sorted = agents
        .filter(a => a.current_load < a.max_capacity) // Only agents below capacity
        .map(a => ({
            ...a,
            loadPercentage: (a.current_load / a.max_capacity) * 100
        }))
        .sort((a, b) => a.loadPercentage - b.loadPercentage)

    return sorted[0]?.agent_id || null
}

async function skillsBasedAssignment(conv: any, agentPool?: string[]): Promise<string | null> {
    // Extract required skills from conversation tags
    const requiredSkills = conv.tags || []

    if (requiredSkills.length === 0) {
        // No skills required, fallback to load balance
        return await loadBalanceAssignment(agentPool)
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
        return await loadBalanceAssignment(agentPool)
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

    // Check availability of top agents
    for (const agentId of sortedAgents) {
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

async function incrementAgentLoad(agentId: string) {
    await supabaseAdmin.rpc('increment_agent_load', { agent_id: agentId })
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
