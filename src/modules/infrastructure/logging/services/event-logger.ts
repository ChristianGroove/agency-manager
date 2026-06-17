import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { logger } from "@/modules/core/logging/logger"

type EventTrigger = 'system' | 'user' | 'webhook'

interface LogEventParams {
    entity_type: string
    entity_id: string
    event_type: string
    payload?: any
    triggered_by?: EventTrigger
    actor_id?: string
}

/**
 * Logs a domain event to the domain_events table.
 * This is a fire-and-forget operation that suppresses errors to avoid breaking the main application flow.
 */
export async function logDomainEvent(params: LogEventParams) {
    try {
        const { error } = await supabaseAdmin
            .from('domain_events')
            .insert({
                entity_type: params.entity_type,
                entity_id: params.entity_id,
                event_type: params.event_type,
                payload: params.payload || {},
                triggered_by: params.triggered_by || 'system',
                actor_id: params.actor_id
            })

        if (error) {
            logger.error("Failed to log domain event to database", error, { event_type: params.event_type })
        }
    } catch (err) {
        logger.error("Exception logging domain event to database", err, { event_type: params.event_type })
    }
}
