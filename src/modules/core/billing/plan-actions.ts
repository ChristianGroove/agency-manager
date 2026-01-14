"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================
// TYPES
// ============================================

export type PlanCode = 'starter' | 'professional' | 'business' | 'scale'

export interface PlanTemplate {
    id: string
    plan_code: PlanCode
    plan_name: string
    price_monthly: number
    price_yearly: number
    features: {
        users: number
        white_label: boolean
        api_access: boolean
        custom_domain: boolean
    }
}

export interface UsageLimit {
    engine: string
    period: string
    limit_value: number
}

export interface UsageCounter {
    engine: string
    period: string
    period_start: string
    used: number
}

export interface UsageStatus {
    engine: string
    limit: number
    used: number
    remaining: number
    percentage: number
    is_unlimited: boolean
    is_exceeded: boolean
}

// ============================================
// GET AVAILABLE PLANS
// ============================================

export async function getAvailablePlans(): Promise<PlanTemplate[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('plan_templates')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })

    if (error) {
        console.error('Error fetching plans:', error)
        return []
    }

    return data as PlanTemplate[]
}

// ============================================
// GET ORG USAGE STATUS
// ============================================

export async function getOrgUsageStatus(organizationId: string): Promise<UsageStatus[]> {
    const supabase = await createClient()

    // Get limits
    const { data: limits } = await supabase
        .from('usage_limits')
        .select('engine, period, limit_value')
        .eq('organization_id', organizationId)

    if (!limits || limits.length === 0) {
        return []
    }

    // Get current counters
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0]

    const { data: counters } = await supabase
        .from('usage_counters')
        .select('engine, period, period_start, used')
        .eq('organization_id', organizationId)
        .in('period_start', [today, monthStart])

    // Build status for each engine
    const statuses: UsageStatus[] = limits.map(limit => {
        const periodStart = limit.period === 'day' ? today : monthStart
        const counter = counters?.find(
            c => c.engine === limit.engine && c.period === limit.period && c.period_start === periodStart
        )

        const used = counter?.used || 0
        const limitVal = limit.limit_value
        const isUnlimited = limitVal === -1

        return {
            engine: limit.engine,
            limit: limitVal,
            used,
            remaining: isUnlimited ? Infinity : Math.max(0, limitVal - used),
            percentage: isUnlimited ? 0 : Math.min(100, Math.round((used / limitVal) * 100)),
            is_unlimited: isUnlimited,
            is_exceeded: !isUnlimited && used >= limitVal
        }
    })

    return statuses
}

// ============================================
// INCREMENT USAGE COUNTER
// ============================================

export async function incrementUsage(
    organizationId: string,
    engine: string,
    quantity: number = 1
): Promise<{ success: boolean; error?: string; exceeded?: boolean }> {

    // First check if allowed
    const status = await getOrgUsageStatus(organizationId)
    const engineStatus = status.find(s => s.engine === engine)

    if (engineStatus && !engineStatus.is_unlimited) {
        if (engineStatus.used + quantity > engineStatus.limit) {
            return {
                success: false,
                error: `Límite de ${engine} excedido. Actual: ${engineStatus.used}/${engineStatus.limit}`,
                exceeded: true
            }
        }
    }

    // Determine period
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0]

    // Check which period this engine uses
    const { data: limits } = await supabaseAdmin
        .from('usage_limits')
        .select('period')
        .eq('organization_id', organizationId)
        .eq('engine', engine)

    const period = limits?.[0]?.period || 'month'
    const periodStart = period === 'day' ? today : monthStart

    // Upsert counter
    const { error } = await supabaseAdmin
        .from('usage_counters')
        .upsert({
            organization_id: organizationId,
            engine,
            period,
            period_start: periodStart,
            used: quantity,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id,engine,period,period_start'
        })

    if (error) {
        // If upsert failed, try increment
        const { error: updateError } = await supabaseAdmin
            .rpc('increment_usage_counter', {
                p_org_id: organizationId,
                p_engine: engine,
                p_period: period,
                p_period_start: periodStart,
                p_quantity: quantity
            })

        if (updateError) {
            console.error('Failed to increment usage:', updateError)
            return { success: false, error: 'Failed to track usage' }
        }
    }

    return { success: true }
}

// ============================================
// UPGRADE PLAN
// ============================================

export async function upgradePlan(
    organizationId: string,
    newPlanCode: PlanCode
): Promise<{ success: boolean; error?: string }> {

    const { data, error } = await supabaseAdmin
        .rpc('upgrade_org_plan', {
            p_organization_id: organizationId,
            p_new_plan_code: newPlanCode
        })

    if (error) {
        console.error('Failed to upgrade plan:', error)
        return { success: false, error: 'Error al actualizar el plan' }
    }

    return { success: data === true }
}

// ============================================
// GET PLAN FOR ORG
// ============================================

export async function getOrgPlan(organizationId: string): Promise<PlanTemplate | null> {
    const supabase = await createClient()

    // Get org limits to determine plan
    const { data: limits } = await supabase
        .from('usage_limits')
        .select('limit_value')
        .eq('organization_id', organizationId)
        .eq('engine', 'whatsapp')
        .single()

    if (!limits) return null

    // Match by WhatsApp limit
    const planMapping: Record<number, PlanCode> = {
        1000: 'starter',
        5000: 'professional',
        15000: 'business',
        [-1]: 'scale'
    }

    const planCode = planMapping[limits.limit_value] || 'starter'

    const plans = await getAvailablePlans()
    return plans.find(p => p.plan_code === planCode) || null
}
