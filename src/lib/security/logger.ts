import { supabaseAdmin } from "@/lib/supabase-admin"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase-server"

export interface SecurityEvent {
    action: string
    resource_entity: string // e.g., 'leads', 'invoices', 'settings'
    resource_id?: string
    metadata?: Record<string, any>
    organization_id: string
}

export class SecurityLogger {

    /**
     * Log a security event to the immutable audit log
     */
    static async log({
        action,
        resource_entity,
        resource_id,
        metadata = {},
        organization_id
    }: SecurityEvent) {
        try {
            // 1. Resolve Actor (User)
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()
            const actor_id = user?.id

            // 2. Resolve Environment Context
            const headersList = await headers()
            const ip_address = headersList.get('x-forwarded-for') || 'unknown'
            const user_agent = headersList.get('user-agent') || 'unknown'

            // 3. Write to DB (Using Admin to bypass "No Client Insert" policy)
            const { error } = await supabaseAdmin.from('security_audit_logs').insert({
                organization_id,
                actor_id,
                action,
                resource_entity,
                resource_id,
                metadata,
                ip_address,
                user_agent
            })

            if (error) {
                console.error("[SecurityLogger] Failed to write log:", error)
                // We do NOT throw here to avoid breaking the main business flow if logging fails
                // But in a high-security environment, we might want to fail-closed.
                // For this SaaS, fail-open (log error but allow action) is better for UX.
            }
        } catch (error) {
            console.error("[SecurityLogger] Exception:", error)
        }
    }
}
