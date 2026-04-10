import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Service Layer for Billing Module - Revenue Share & Settlements
 * Contains pure business logic and DB interactions.
 */

// Types re-exported or defined here for service boundaries
export type BillableEventType =
    | 'subscription_base'
    | 'subscription_addon'
    | 'addon'
    | 'overage'
    | 'upsell'
    | 'one_time'

export async function getRevenueShareRules() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('revenue_share_rules').select('*').order('phase_start_month', { ascending: true })
    if (error) return []
    return data || []
}

export async function upsertRevenueShareRule(rule: any) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('revenue_share_rules').upsert({ ...rule, updated_at: new Date().toISOString() }).select().single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function registerBillableEvent(params: {
    organization_id: string
    event_type: BillableEventType
    amount: number
    description?: string
    currency?: string
    invoice_id?: string
    stripe_payment_intent_id?: string
}) {
    const { supabaseAdmin } = await import("@/modules/core/database/supabase-admin")
    const supabase = supabaseAdmin

    const { data: org, error: orgError } = await supabase.from('organizations').select('id, acquired_by_reseller_id, acquisition_date').eq('id', params.organization_id).single()
    if (orgError || !org) return { success: false, error: 'Organización no encontrada' }

    let resellerChain: { org_id: string; level: number }[] = []
    if (org.acquired_by_reseller_id) {
        resellerChain = [{ org_id: org.acquired_by_reseller_id, level: 1 }]
    }

    let clientAgeMonths = 0
    if (org.acquisition_date) {
        const acquisitionDate = new Date(org.acquisition_date)
        const now = new Date()
        clientAgeMonths = Math.max(0, (now.getFullYear() - acquisitionDate.getFullYear()) * 12 + (now.getMonth() - acquisitionDate.getMonth()))
    }

    const { data, error } = await supabase.from('billable_events').insert({
        organization_id: params.organization_id,
        reseller_chain: resellerChain,
        event_type: params.event_type,
        amount: params.amount,
        description: params.description || null,
        currency: params.currency || 'USD',
        invoice_id: params.invoice_id || null,
        stripe_payment_intent_id: params.stripe_payment_intent_id || null,
        client_age_months: clientAgeMonths,
        event_date: new Date().toISOString()
    }).select('id').single()

    if (error) return { success: false, error: error.message }
    return { success: true, event_id: data.id }
}

export async function calculateSettlement(params: { reseller_org_id: string, period_start: string, period_end: string }) {
    const supabase = await createClient()
    
    // 1. Get events
    const { data: events, error: eventsError } = await supabase
        .from('billable_events')
        .select('*')
        .eq('settled', false)
        .gte('event_date', params.period_start)
        .lte('event_date', params.period_end + 'T23:59:59Z')
        .contains('reseller_chain', [{ org_id: params.reseller_org_id }])

    if (eventsError) return { success: false, error: eventsError.message }
    if (!events?.length) return { success: false, error: 'No hay eventos para liquidar' }

    // 2. Process comissions
    let totalGross = 0; let totalCommission = 0;
    const breakdown: Record<string, any> = {};
    const eventUpdates: any[] = [];

    for (const event of events) {
        const { data: calcResult } = await supabase.rpc('calculate_event_commission', { p_event_id: event.id })
        const result = calcResult?.[0]
        const commission = result?.commission_amount || 0
        const phase = result?.phase_name || 'unknown'

        totalGross += event.amount; totalCommission += commission;

        if (!breakdown[phase]) breakdown[phase] = { events: 0, gross: 0, commission: 0 }
        breakdown[phase].events += 1; breakdown[phase].gross += event.amount; breakdown[phase].commission += commission;

        eventUpdates.push({ id: event.id, commission, rule_id: result?.rule_id || null, phase })
    }

    // 3. Save Settlement
    const { data: settlement, error: sError } = await supabase.from('settlements').insert({
        reseller_org_id: params.reseller_org_id, period_start: params.period_start, period_end: params.period_end,
        gross_revenue: totalGross, total_commission: totalCommission, platform_fee: totalGross - totalCommission, net_payout: totalCommission,
        breakdown, event_count: events.length, status: 'pending'
    }).select('id').single()

    if (sError) return { success: false, error: sError.message }

    // 4. Update events
    for (const u of eventUpdates) {
        await supabase.from('billable_events').update({ settled: true, settlement_id: settlement.id, commission_calculated: u.commission, commission_rule_id: u.rule_id, commission_phase: u.phase }).eq('id', u.id)
    }

    return { success: true, settlement_id: settlement.id }
}

export async function approveSettlement(settlement_id: string, userId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('settlements').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: userId }).eq('id', settlement_id).eq('status', 'pending')
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function getRevenueMetrics(reseller_org_id?: string) {
    const orgId = reseller_org_id || await (await import("@/modules/core/organizations/organization-actions")).getCurrentOrganizationId()
    if (!orgId) return { total_clients: 0, total_revenue: 0, total_commission_earned: 0, pending_commission: 0, clients_by_phase: {} }
    
    const supabase = await createClient()
    const { count: totalClients } = await supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('acquired_by_reseller_id', orgId)
    
    const { data: clientIds } = await supabase.from('organizations').select('id, acquisition_date').eq('acquired_by_reseller_id', orgId)
    
    let totalRevenue = 0; let totalCommissionEarned = 0; let pendingCommission = 0;
    const clientsByPhase: Record<string, number> = { activation: 0, retention: 0, stable: 0 }

    if (clientIds?.length) {
        const ids = clientIds.map(c => c.id)
        const { data: events } = await supabase.from('billable_events').select('amount, commission_calculated, settled').in('organization_id', ids)
        
        if (events) {
            for (const e of events) {
                totalRevenue += e.amount || 0
                if (e.settled) totalCommissionEarned += e.commission_calculated || 0
                else pendingCommission += (e.amount || 0) * 0.25
            }
        }

        const now = new Date()
        for (const c of clientIds) {
            if (!c.acquisition_date) { clientsByPhase.activation += 1; continue; }
            const acq = new Date(c.acquisition_date)
            const months = (now.getFullYear() - acq.getFullYear()) * 12 + (now.getMonth() - acq.getMonth())
            if (months <= 6) clientsByPhase.activation += 1
            else if (months <= 12) clientsByPhase.retention += 1
            else clientsByPhase.stable += 1
        }
    }

    return { total_clients: totalClients || 0, total_revenue: totalRevenue, total_commission_earned: totalCommissionEarned, pending_commission: pendingCommission, clients_by_phase: clientsByPhase }
}

