'use server'

import { createClient } from "@/lib/supabase-server"

export interface AuditLogEntry {
    id: string
    created_at: string
    actor_id: string
    action: string
    entity_type: string
    entity_id: string
    metadata: any
    actor_email?: string
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
    const supabase = await createClient()

    // Fetch logs related to billing
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select(`
            id,
            created_at,
            actor_id,
            action,
            entity_type,
            entity_id,
            metadata
        `)
        .in('entity_type', ['BILLING_DOCUMENT', 'INVOICE', 'PAYMENT', 'DIAN_EVIDENCE'])
        .order('created_at', { ascending: false })
        .limit(100) // Reasonable limit for UI

    if (error) {
        console.error("Error fetching audit logs", error)
        return []
    }

    // Enrich with actor info (email) if possible
    // Note: In real app, we might join with a profiles table or use auth admin.
    // For now, we return raw logs. Actor email might be in metadata or separate fetch.

    return logs.map((log: any) => ({
        ...log,
        actor_email: log.metadata?.actor_email || 'System/Unknown'
    }))
}
