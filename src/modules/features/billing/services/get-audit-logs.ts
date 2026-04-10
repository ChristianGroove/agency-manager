'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { AuditLogEntry } from "../types"

export async function getAuditLogs(entityId?: string): Promise<AuditLogEntry[]> {
    const supabase = await createClient()

    // Fetch logs related to billing
    let query = supabase
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

    if (entityId) {
        query = query.eq('entity_id', entityId)
    }

    const { data: logs, error } = await query
        .order('created_at', { ascending: false })
        .limit(100)

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
