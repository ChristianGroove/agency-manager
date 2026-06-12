"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

/**
 * Obtiene el estado de las llamadas para una conversación (Permisos, Horarios, Ventana).
 */
export async function getCallStatus(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'Unauthorized' }

    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('organization_id, connection_id, lead_id')
        .eq('id', conversationId)
        .eq('organization_id', orgId)
        .single()

    if (convError || !conv) return { success: false, error: 'Conversation not found' }

    const callingEnabled = true
    const { data: connection } = await supabaseAdmin
        .from('integration_connections')
        .select('working_hours')
        .eq('id', conv.connection_id)
        .eq('organization_id', orgId)
        .single()

    const { CallPermissionManager } = await import('@/modules/infrastructure/meta/services/calling/call-permission-manager')
    const { CallHoursManager } = await import('@/modules/infrastructure/meta/services/calling/call-hours-manager')

    const permissionManager = new CallPermissionManager()
    const hoursManager = new CallHoursManager(connection?.working_hours as any)

    const permResult = await permissionManager.canMakeCall(conversationId)
    const isWithinHours = await hoursManager.isWithinCallHours()
    const isSessionActive = true 

    return {
        success: true,
        callingEnabled,
        permStatus: {
            hasPermission: permResult.allowed,
            expiresAt: permResult.expiresAt?.toISOString() || null,
            reason: permResult.reason
        },
        isWithinHours,
        isSessionActive
    }
}
