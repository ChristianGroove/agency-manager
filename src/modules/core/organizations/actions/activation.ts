"use server"

import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { isSuperAdmin } from '@/modules/core/iam/services/platform-roles'
import { getCurrentOrganizationId, getUserOrganizations } from './crud'
import { sendTenantActivation } from '../services/tenant-activation'

export async function resendOrganizationActivation(organizationId: string) {
    try {
        const client = await createClient()
        const { data: { user } } = await client.auth.getUser()
        if (!user) return { success: false, error: 'Inicia sesión para continuar.' }
        const currentOrgId = await getCurrentOrganizationId()
        const platformAdmin = await isSuperAdmin(user.id)
        if (!platformAdmin) {
            const memberships = await getUserOrganizations()
            const reseller = memberships.find(member => member.organization_id === currentOrgId &&
                member.organization?.organization_type === 'reseller' && member.status !== 'blocked' &&
                ['owner', 'admin'].includes(member.role))
            if (!reseller) return { success: false, error: 'No tienes permiso para reenviar esta activación.' }
        }
        const { data: org, error } = await supabaseAdmin.from('organizations')
            .select('owner_id, status, parent_organization_id, organization_type').eq('id', organizationId).maybeSingle()
        if (error || !org || (!platformAdmin && (org.parent_organization_id !== currentOrgId || org.organization_type !== 'client'))) {
            return { success: false, error: 'No tienes permiso para reenviar esta activación.' }
        }
        if (!org.owner_id) return { success: false, error: 'Esta organización no tiene propietario asignado. Revisa su alta antes de enviar una activación.' }
        if (org.status !== 'active') return { success: false, error: 'La organización debe estar activa.' }
        const { data: owner, error: ownerError } = await supabaseAdmin.from('organization_members')
            .select('role, status, permissions, deleted_at').eq('organization_id', organizationId).eq('user_id', org.owner_id).maybeSingle()
        if (ownerError || !owner || owner.role !== 'owner' || owner.status === 'blocked' || owner.deleted_at ||
            (owner.permissions as Record<string, unknown> | null)?.is_support_proxy) {
            return { success: false, error: 'El propietario no tiene acceso activo. Revisa su membresía antes de reenviar.' }
        }
        const result = await sendTenantActivation(organizationId, currentOrgId, true)
        return { success: result.sent, error: result.error }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo reenviar la activación.' }
    }
}
