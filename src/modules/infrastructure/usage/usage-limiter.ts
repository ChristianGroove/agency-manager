import { createClient } from "@/lib/supabase-server"
import { Engine } from "./usage-tracker"

export class UsageLimitError extends Error {
    constructor(message: string, public reason: 'suspended' | 'limit_exceeded' | 'payment_failed') {
        super(message)
        this.name = 'UsageLimitError'
    }
}

export async function assertUsageAllowed({
    organizationId,
    engine,
    quantity = 1
}: {
    organizationId: string
    engine: Engine
    quantity?: number
}) {
    const supabase = await createClient()

    // 1. Check Organization Status
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('status, payment_status')
        .eq('id', organizationId)
        .single()

    if (orgError) {
        // Fail open or closed? Closed for security.
        console.error('Failed to check org status', orgError)
        throw new Error('Could not verify organization status')
    }

    if (org.status === 'suspended') {
        throw new UsageLimitError('Organization is suspended', 'suspended')
    }

    // 2. Check Limits & Counters (Parallel)
    // We check both Day and Month if limits exist for them.
    // Usually only one applies per engine, but we support both.

    // Fetch Limits
    const { data: limits } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('engine', engine)

    if (!limits || limits.length === 0) {
        // No limits defined? 
        // Strategy: Allow (Freemium/Unlimited) OR Block?
        // Usually Default Limit should be present.
        // For Phase 3: Allow if no limit found (or user default).
        return { allowed: true }
    }

    // Fetch Counters for relevant periods
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] // simplified

    const { data: counters } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('engine', engine)
        .in('period_start', [today, monthStart])

    // Compare
    for (const limit of limits) {
        const periodStart = limit.period === 'day' ? today : monthStart

        const counter = counters?.find(c => c.period === limit.period && c.period_start === periodStart)
        const currentUsage = counter ? counter.used : 0

        if (currentUsage + quantity > limit.limit_value) {
            throw new UsageLimitError(
                `Usage limit exceeded for ${engine} (${limit.period}). Limit: ${limit.limit_value}, Used: ${currentUsage}`,
                'limit_exceeded'
            )
        }
    }
}
