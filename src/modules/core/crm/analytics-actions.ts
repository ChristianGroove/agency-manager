'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Helper to get org
async function getOrgId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    return data?.organization_id
}

export interface CRMStats {
    totalLeads: number
    newLeadsThisMonth: number
    pipelineValue: number
    conversionRate: number
    avgDealSize: number
    openConversations: number
}

export async function getCRMStats(days: number = 30): Promise<{ success: boolean, stats?: CRMStats, error?: string }> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: 'Unauthorized' }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        const startDateStr = startDate.toISOString()

        // Total leads
        const { count: totalLeads } = await supabaseAdmin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        // New leads this period
        const { count: newLeads } = await supabaseAdmin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .gte('created_at', startDateStr)

        // Pipeline value (sum of all open deals)
        const { data: dealsData } = await supabaseAdmin
            .from('leads')
            .select('value')
            .eq('organization_id', orgId)
            .in('status', ['new', 'contacted', 'qualified', 'negotiation'])

        const pipelineValue = dealsData?.reduce((sum, d) => sum + (d.value || 0), 0) || 0

        // Won deals for conversion rate
        const { count: wonDeals } = await supabaseAdmin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('status', 'won')

        // All closed deals (won + lost)
        const { count: closedDeals } = await supabaseAdmin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .in('status', ['won', 'lost'])

        const conversionRate = closedDeals && closedDeals > 0
            ? Math.round((wonDeals || 0) / closedDeals * 100)
            : 0

        // Average deal size (won deals)
        const { data: wonDealsData } = await supabaseAdmin
            .from('leads')
            .select('value')
            .eq('organization_id', orgId)
            .eq('status', 'won')

        const avgDealSize = wonDealsData && wonDealsData.length > 0
            ? Math.round(wonDealsData.reduce((sum, d) => sum + (d.value || 0), 0) / wonDealsData.length)
            : 0

        // Open conversations
        const { count: openConversations } = await supabaseAdmin
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('status', 'open')

        return {
            success: true,
            stats: {
                totalLeads: totalLeads || 0,
                newLeadsThisMonth: newLeads || 0,
                pipelineValue,
                conversionRate,
                avgDealSize,
                openConversations: openConversations || 0
            }
        }
    } catch (error) {
        console.error('getCRMStats error:', error)
        return { success: false, error: String(error) }
    }
}

export interface LeadsBySource {
    source: string
    count: number
    percentage: number
}

export async function getLeadsBySource(days: number = 30): Promise<{ success: boolean, data?: LeadsBySource[], error?: string }> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: 'Unauthorized' }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('source')
            .eq('organization_id', orgId)
            .gte('created_at', startDate.toISOString())

        if (error) throw error

        // Group by source
        const sourceMap: Record<string, number> = {}
        data?.forEach(lead => {
            const source = lead.source || 'direct'
            sourceMap[source] = (sourceMap[source] || 0) + 1
        })

        const total = data?.length || 1
        const result: LeadsBySource[] = Object.entries(sourceMap)
            .map(([source, count]) => ({
                source,
                count,
                percentage: Math.round((count / total) * 100)
            }))
            .sort((a, b) => b.count - a.count)

        return { success: true, data: result }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export interface LeadsByStatus {
    status: string
    count: number
    value: number
}

export async function getLeadsByStatus(): Promise<{ success: boolean, data?: LeadsByStatus[], error?: string }> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: 'Unauthorized' }

        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('status, value')
            .eq('organization_id', orgId)

        if (error) throw error

        // Group by status
        const statusMap: Record<string, { count: number, value: number }> = {}
        data?.forEach(lead => {
            const status = lead.status || 'new'
            if (!statusMap[status]) statusMap[status] = { count: 0, value: 0 }
            statusMap[status].count++
            statusMap[status].value += lead.value || 0
        })

        const statusOrder = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost']
        const result: LeadsByStatus[] = statusOrder
            .filter(s => statusMap[s])
            .map(status => ({
                status,
                count: statusMap[status].count,
                value: statusMap[status].value
            }))

        return { success: true, data: result }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export interface RecentActivity {
    id: string
    type: 'lead_created' | 'deal_won' | 'message_received' | 'status_changed'
    leadName: string
    leadId: string
    description: string
    timestamp: string
}

export async function getRecentActivity(limit: number = 10): Promise<{ success: boolean, data?: RecentActivity[], error?: string }> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: 'Unauthorized' }

        // Get recently created leads
        const { data: recentLeads } = await supabaseAdmin
            .from('leads')
            .select('id, name, status, created_at, updated_at')
            .eq('organization_id', orgId)
            .order('updated_at', { ascending: false })
            .limit(limit)

        const activities: RecentActivity[] = (recentLeads || []).map(lead => ({
            id: lead.id,
            type: lead.status === 'won' ? 'deal_won' : 'lead_created',
            leadName: lead.name || 'Sin nombre',
            leadId: lead.id,
            description: lead.status === 'won'
                ? 'Deal cerrado exitosamente'
                : `Nuevo lead: ${lead.name}`,
            timestamp: lead.updated_at
        }))

        return { success: true, data: activities }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export interface AgentPerformance {
    agentId: string
    agentName: string
    leadsAssigned: number
    dealsWon: number
    conversionRate: number
    totalValue: number
}

export async function getAgentPerformance(): Promise<{ success: boolean, data?: AgentPerformance[], error?: string }> {
    try {
        const orgId = await getOrgId()
        if (!orgId) return { success: false, error: 'Unauthorized' }

        // Get all team members (without auth.users join)
        const { data: members } = await supabaseAdmin
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', orgId)

        if (!members) return { success: true, data: [] }

        const performance: AgentPerformance[] = []

        for (const member of members) {
            // Count assigned leads
            const { count: assigned } = await supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('assigned_to', member.user_id)

            // Count won deals
            const { data: wonData } = await supabaseAdmin
                .from('leads')
                .select('value')
                .eq('organization_id', orgId)
                .eq('assigned_to', member.user_id)
                .eq('status', 'won')

            // Use shortened user_id as name placeholder
            const name = `Agente ${member.user_id.slice(0, 6)}`

            performance.push({
                agentId: member.user_id,
                agentName: name,
                leadsAssigned: assigned || 0,
                dealsWon: wonData?.length || 0,
                conversionRate: assigned && assigned > 0
                    ? Math.round(((wonData?.length || 0) / assigned) * 100)
                    : 0,
                totalValue: wonData?.reduce((sum, d) => sum + (d.value || 0), 0) || 0
            })
        }

        return { success: true, data: performance.sort((a, b) => b.totalValue - a.totalValue) }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}
