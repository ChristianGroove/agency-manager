import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { validateInviteCode } from '@/modules/core/iam/actions/invitation-actions'

export async function resolveOnboardingContext(user: User) {
    const { data: memberships, error } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role, status, permissions, organization:organizations!inner(id, name, slug, status, active_app_id, organization_type, active_app:saas_apps!active_app_id(name))')
        .eq('user_id', user.id)
    if (error) throw new Error('No se pudo verificar tu organización. Intenta de nuevo.')

    const eligible = (memberships || []).filter(member =>
        member.status !== 'blocked' && !(member.permissions as Record<string, unknown> | null)?.is_support_proxy
    )
    const invitedOrgId = user.app_metadata?.invited_org_id || user.user_metadata?.invited_org_id
    const membership = invitedOrgId ? eligible.find(member => member.organization_id === invitedOrgId) : eligible[0]
    const organization = membership?.organization as unknown as {
        id: string; name: string; slug: string; status: string; active_app_id: string;
        organization_type: string; active_app: { name: string } | null
    } | undefined

    if (organization && organization.status !== 'active') {
        throw new Error('Tu organización no está activa. Contacta a soporte.')
    }
    if (!organization && (invitedOrgId || (memberships || []).some(member => member.status === 'blocked'))) {
        throw new Error('No tienes acceso a la organización invitada. Contacta a soporte.')
    }

    // Never derive organization authority from the type/parent submitted by the browser.
    let invitation = null
    if (!organization) {
        const code = user.app_metadata?.onboarding_invite_code || user.user_metadata?.invited_by_code
        const validation = await validateInviteCode(code)
        if (!validation.isValid || !validation.invitation) {
            throw new Error(validation.error || 'Se requiere una invitación válida para crear tu organización.')
        }
        invitation = validation.invitation
        if (invitation.recipient_email && invitation.recipient_email.trim().toLowerCase() !== user.email?.toLowerCase()) {
            throw new Error('Esta invitación pertenece a otro correo electrónico.')
        }
    }

    return {
        organization: organization ? {
            id: organization.id, name: organization.name, slug: organization.slug,
            app_id: organization.active_app_id, app_name: organization.active_app?.name || 'Espacio asignado',
            organization_type: organization.organization_type
        } : null,
        invitation,
        requiresPassword: user.app_metadata?.password_setup_required === true ||
            (user.app_metadata?.password_setup_required !== false && !!user.invited_at && user.user_metadata?.password_configured !== true),
        fullName: user.user_metadata?.full_name === 'Admin' ? '' : (user.user_metadata?.full_name || '')
    }
}
