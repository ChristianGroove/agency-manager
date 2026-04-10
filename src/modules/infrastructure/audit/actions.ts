'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

export interface SecurityAuditLog {
    id: string
    organization_id: string
    actor_id: string
    action: string
    resource_entity: string
    resource_id: string | null
    metadata: Record<string, any>
    ip_address: string | null
    user_agent: string | null
    created_at: string
    actor?: {
        email: string
        full_name: string
    }
}

export async function getSecurityAuditLogs(
    page = 1,
    pageSize = 50,
    filters?: { action?: string; resource?: string }
): Promise<{ logs: SecurityAuditLog[]; total: number }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { logs: [], total: 0 }

    let query = supabase
        .from('security_audit_logs')
        .select('*, actor:actor_id(email, input_data)', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    if (filters?.action) {
        query = query.eq('action', filters.action)
    }

    if (filters?.resource) {
        query = query.ilike('resource_entity', `%${filters.resource}%`)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching audit logs:', error)
        return { logs: [], total: 0 }
    }

    // Map and transform actor data if needed (profiles are in auth.users or public.profiles?)
    // Typically actor_id links to auth.users which is restricted.
    // However, if we joined with a public profile table it would work.
    // If we can't join, we'll just show the ID or fetch profiles separately.
    // For now, let's assume the join might fail or return null depending on RLS.

    // Actually, `security_audit_logs` might not maintain FK to users if users are deleted.
    // Let's retry with a cleaner select.

    const logs = data.map((log: any) => ({
        ...log,
        actor: log.actor ? {
            email: log.actor.email,
            full_name: (log.actor.input_data as any)?.full_name || 'User'
        } : undefined
    }))

    return { logs, total: count || 0 }
}

