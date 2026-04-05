import { createClient } from '@supabase/supabase-js'

// Use Service Role key for fire-and-forget logging to avoid RLS/Auth issues
// This client should only be used server-side
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Engine = 'automation' | 'messaging' | 'ai' | 'documents' | 'storage'

export interface TrackUsageParams {
    organizationId: string
    parentOrganizationId?: string | null
    engine: Engine
    action: string
    quantity?: number
    metadata?: Record<string, any>
}

/**
 * Tracks a consumption event in the system.
 * Designed to be "Fire and Forget" - never blocks the main business logic.
 */
export async function trackUsage({
    organizationId,
    parentOrganizationId,
    engine,
    action,
    quantity = 1,
    metadata = {}
}: TrackUsageParams) {
    // Fire and forget (don't await this if you don't want to block, 
    // but in Server Actions usually we want to ensure it fires before lambda dies)
    // We will use a catch block to ensure business logic doesn't fail.
    try {
        const payload = {
            organization_id: organizationId,
            parent_organization_id: parentOrganizationId ?? null,
            engine,
            action,
            quantity,
            metadata
        }

        // We use supabaseAdmin to ensure we can write to the usage table 
        // regardless of user permissions context
        const { error } = await supabaseAdmin
            .from('usage_events')
            .insert(payload)

        if (error) {
            console.error('[Usage Tracking] Error inserting event:', error)
        } else {
            // Atomic Increment Counters
            const { error: counterError } = await supabaseAdmin
                .rpc('increment_usage', {
                    p_organization_id: organizationId,
                    p_engine: engine,
                    p_quantity: quantity
                })

            if (counterError) {
                console.error('[Usage Tracking] Error updating counters:', counterError)
            }
        }
    } catch (err) {
        console.error('[Usage Tracking] Exception:', err)
    }
}
