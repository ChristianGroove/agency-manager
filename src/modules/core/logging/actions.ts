'use server'

import { logDomainEvent as internalLog } from "@/lib/event-logger"

/**
 * Server Action wrapper to log events from client components.
 */
export async function logDomainEventAction(params: any) {
    await internalLog({
        ...params,
        triggered_by: 'user'
    })
}
