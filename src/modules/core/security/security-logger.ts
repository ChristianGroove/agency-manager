import { createClient } from '@supabase/supabase-js'

// We use a direct service role client here to bypass RLS for logging
// This ensures we can always write to the audit log regardless of user context
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export enum SecurityAction {
    // Auth
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    PASSWORD_RESET = 'PASSWORD_RESET',

    // Organization
    ORG_CREATED = 'ORG_CREATED',
    ORG_UPDATED = 'ORG_UPDATED',
    ORG_DELETED = 'ORG_DELETED',
    ORG_RESTORED = 'ORG_RESTORED', // Phase 2

    // Members
    MEMBER_INVITED = 'MEMBER_INVITED',
    MEMBER_REMOVED = 'MEMBER_REMOVED',
    ROLE_UPDATED = 'ROLE_UPDATED',

    // Integrations
    INTEGRATION_CONNECTED = 'INTEGRATION_CONNECTED',
    INTEGRATION_DISCONNECTED = 'INTEGRATION_DISCONNECTED',

    // System
    API_KEY_GENERATED = 'API_KEY_GENERATED',
    SETTINGS_UPDATED = 'SETTINGS_UPDATED'
}

export interface SecurityLogParams {
    organizationId: string
    actorId?: string // User ID performing the action
    action: SecurityAction | string
    resourceEntity: string // e.g., 'integration', 'organization', 'user'
    resourceId?: string
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
}

export class SecurityLogger {
    /**
     * Logs a security-relevant action to the immutable audit log
     */
    static async log(params: SecurityLogParams) {
        try {
            const { error } = await supabaseAdmin
                .from('security_audit_logs')
                .insert({
                    organization_id: params.organizationId,
                    actor_id: params.actorId,
                    action: params.action,
                    resource_entity: params.resourceEntity,
                    resource_id: params.resourceId,
                    metadata: params.metadata || {},
                    ip_address: params.ipAddress,
                    user_agent: params.userAgent
                })

            if (error) {
                console.error('[SecurityLogger] Failed to write log:', error)
                // We don't throw here to avoid blocking the main business logic
                // In high-compliance mode, we might want to throw or fallback to file logging
            }
        } catch (err) {
            console.error('[SecurityLogger] Exception:', err)
        }
    }
}
