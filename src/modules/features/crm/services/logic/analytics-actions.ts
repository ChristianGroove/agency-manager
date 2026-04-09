'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

// Helper to get org
async function getOrgId() {
    return await getCurrentOrganizationId()
}

export interface CRMStats {
    totalLeads: number
    newLeadsThisMonth: number
    pipelineValue: number
    conversionRate: number
    avgDealSize: number
    openConversations: number
    avgResponseTime?: number
}

export interface AdvancedReportData {
    period: {
        start: string
        end: string
    }
    summary: {
        total_leads: number
        won_leads: number
        abandoned_leads: number
        avg_response_time: number
        pipeline_value: number
        conversion_rate: number
    }
    agent_performance: Array<{
        agent_id: string
        agent_name: string
        avatar_url: string | null
        leads_assigned: number
        deals_won: number
        avg_response_time: number
        connection_time_seconds: number
        agent_status: string
        sla_met_percentage: number
    }>
    lead_sources: Array<{
        source: string
        count: number
    }>
    activity_trend: Array<{
        date: string
        new_leads: number
        messages_sent: number
    }>
    abandoned_leads_list: Array<{
        id: string
        name: string
        waiting_since: string
        waiting_seconds: number
        assigned_agent: string
        agent_id?: string
    }>
    debug_org_id?: string
}

/**
 * Server action to fetch an image and convert to base64.
 * Used to bypass CORS issues for PDF generation on the client.
 */
export async function getBase64Image(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('data:')) return url;

    try {
        console.log("[getBase64Image] Fetching logo from server:", url);
        
        // --- Special Case: Supabase Storage ---
        // If it's a supabase storage link, we can use the admin client to download it directly
        // bypassing public URL and CORS issues.
        if (url.includes('/storage/v1/object/public/')) {
            try {
                const urlParts = url.split('/storage/v1/object/public/');
                const pathParts = urlParts[1].split('/');
                const bucket = pathParts[0];
                const fileName = pathParts.slice(1).join('/');
                
                console.log(`[getBase64Image] Found Supabase asset: Bucket=${bucket}, Path=${fileName}`);
                
                const { data, error } = await supabaseAdmin.storage.from(bucket).download(fileName);
                if (data && !error) {
                    const arrayBuffer = await data.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const contentType = data.type || 'image/png';
                    console.log(`[getBase64Image] Successfully downloaded via Admin SDK: ${contentType}`);
                    return `data:${contentType};base64,${base64}`;
                }
                console.warn("[getBase64Image] Admin download failed, trying regular fetch...", error);
            } catch (e) {
                console.warn("[getBase64Image] Failed to parse Supabase URL, falling back to fetch");
            }
        }

        // --- Standard Fetch Fallback ---
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            next: { revalidate: 3600 } 
        });
        
        if (!response.ok) {
            console.error(`[getBase64Image] HTTP error! status: ${response.status} for ${url}`);
            return '';
        }
        
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        const base64 = Buffer.from(buffer).toString('base64');
        
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("[getBase64Image] Fatal Error:", error);
        return '';
    }
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
        const { data: convMetrics } = await supabaseAdmin
            .from('conversations')
            .select('average_response_time_seconds')
            .eq('organization_id', orgId)
            .not('average_response_time_seconds', 'eq', 0)

        const avgResponseTime = convMetrics && convMetrics.length > 0
            ? Math.round(convMetrics.reduce((sum, c) => sum + (c.average_response_time_seconds || 0), 0) / convMetrics.length)
            : 0

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
                openConversations: openConversations || 0,
                avgResponseTime
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
    avgResponseTime?: number
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
                .eq('user_id', member.user_id)

            // Count won deals and calculate avg response time
            const { data: convData } = await supabaseAdmin
                .from('conversations')
                .select('average_response_time_seconds, state, last_message_direction, waiting_since')
                .eq('organization_id', orgId)
                .eq('user_id', member.user_id)

            const wonDeals = convData?.filter(c => c.state === 'closed').length || 0 // Simplified won check if we use state
            // Let's stick to leads table for value but use conversations for speed/response metrics
            const { data: leadsData } = await supabaseAdmin
                .from('leads')
                .select('value, status')
                .eq('organization_id', orgId)
                .eq('assigned_to', member.user_id)

            const wonLeads = leadsData?.filter(l => l.status === 'won') || []
            const avgResponseTime = convData && convData.length > 0
                ? Math.round(convData.reduce((sum, c) => sum + (c.average_response_time_seconds || 0), 0) / convData.length)
                : 0

            // Use shortened user_id as name placeholder
            const name = `Agente ${member.user_id.slice(0, 6)}`

            performance.push({
                agentId: member.user_id,
                agentName: name,
                leadsAssigned: assigned || 0,
                dealsWon: wonLeads.length,
                conversionRate: assigned && assigned > 0
                    ? Math.round((wonLeads.length / assigned) * 100)
                    : 0,
                totalValue: wonLeads.reduce((sum, l) => sum + (l.value || 0), 0) || 0,
                avgResponseTime: avgResponseTime // NEW metric
            })
        }

        return { success: true, data: performance.sort((a, b) => b.totalValue - a.totalValue) }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getAdvancedReports(startDate: string, endDate: string, orgId?: string): Promise<{ success: boolean, data?: AdvancedReportData, error?: string }> {
    try {
        const targetOrgId = orgId || await getOrgId()
        
        console.log('**************************************************')
        console.log('CRITICAL DEBUG: getAdvancedReports')
        console.log('Received orgId from client:', orgId)
        console.log('Derived targetOrgId:', targetOrgId)
        console.log('Start:', startDate, 'End:', endDate)
        console.log('**************************************************')

        if (!targetOrgId) {
            console.error('[REPORTS] No organization ID provided or found')
            return { success: false, error: 'No se pudo determinar la organizaciÃ³n activa' }
        }

        const { data, error } = await supabaseAdmin.rpc('get_advanced_crm_reports', {
            p_org_id: targetOrgId,
            p_start_date: startDate,
            p_end_date: endDate
        })

        if (error) {
            console.error('[REPORTS] RPC Error:', error)
            throw error
        }

        console.log('[REPORTS] Result Summary:', data?.summary)
        console.log('[REPORTS] Agents returned:', data?.agent_performance?.length)
        console.log('**************************************************')

        return { success: true, data: data as AdvancedReportData }
    } catch (error) {
        console.error('[REPORTS] Catch:', error)
        return { success: false, error: String(error) }
    }
}

