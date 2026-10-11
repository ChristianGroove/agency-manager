import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getAuthRedirectBase } from '@/modules/core/iam/services/auth-utils'
import { getSecureAuthLink } from '@/modules/core/iam/services/auth-link-utils'
import { EmailService } from '@/modules/features/notifications/email.service'
import { getAuthInviteEmailHtml, getAuthConfirmationEmailHtml } from '@/modules/infrastructure/notifications/services/email-templates'

/** Resolve the account before provisioning; an Auth failure must not leave a tenant without its owner. */
async function findTenantOwner(email: string): Promise<User | null> {
    let page = 1
    while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw error
        const existing = data.users.find(user => user.email?.toLowerCase() === email)
        if (existing) return existing
        if (data.users.length < 1000) break
        page++
    }
    return null
}

export async function resolveTenantOwner(email: string): Promise<User> {
    const existing = await findTenantOwner(email)
    if (existing) return existing
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite', email,
        options: { data: { full_name: 'Admin' }, redirectTo: `${getAuthRedirectBase()}/auth/confirm` }
    })
    if (error) {
        // Another request may have created the same Auth account while we were resolving it.
        if (error.code === 'email_exists' || error.status === 422) {
            const existing = await findTenantOwner(email)
            if (existing) return existing
        }
        throw error
    }
    if (!data.user) throw new Error('No se pudo preparar la cuenta del propietario.')
    return data.user
}

/** Delivery is outside the DB transaction. A persisted claim prevents concurrent sends and supports retries. */
export async function sendTenantActivation(organizationId: string, senderOrganizationId: string | null, resend = false) {
    const { data: claim, error: claimError } = await supabaseAdmin.rpc('claim_tenant_activation', {
        p_organization_id: organizationId, p_resend: resend
    })
    if (claimError) return { sent: false, error: 'No se pudo registrar el envío de activación.' }
    if (claim?.already_sent) return { sent: true }
    if (!claim?.claimed) return { sent: false, error: 'Hay un envío reciente o en curso. Intenta de nuevo en un minuto.' }

    let deliveryError: string | null = null
    try {
        const { data: organization, error: orgError } = await supabaseAdmin.from('organizations')
            .select('id, name, owner_id, status').eq('id', organizationId).single()
        if (orgError || !organization?.owner_id || organization.status !== 'active') throw new Error('La organización no tiene un propietario activo.')
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(organization.owner_id)
        if (error || !data.user?.email) throw new Error('No se pudo verificar el correo del propietario.')
        const owner = data.user
        const passwordRequired = owner.app_metadata?.password_setup_required === true ||
            (owner.app_metadata?.password_setup_required !== false && !!owner.invited_at && owner.user_metadata?.password_configured !== true)
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(owner.id, {
            user_metadata: { ...owner.user_metadata, invited_org_id: organization.id, onboarding_completed: true },
            app_metadata: { ...owner.app_metadata, invited_org_id: organization.id, password_setup_required: passwordRequired }
        })
        if (metadataError) throw metadataError

        let link = `${getAuthRedirectBase()}/onboarding`
        if (!owner.email_confirmed_at) {
            const { data: generated, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink', email: owner.email!, options: { redirectTo: `${getAuthRedirectBase()}/auth/confirm` }
            })
            if (linkError || !generated.properties?.action_link) throw new Error('No se pudo generar el enlace de activación.')
            link = getSecureAuthLink(generated.properties.action_link, generated.properties.verification_type || 'magiclink', getAuthRedirectBase(), '/onboarding')
        }
        const sender = senderOrganizationId || 'PLATFORM'
        const identity = await EmailService.getSenderIdentity(sender)
        const html = owner.email_confirmed_at
            ? getAuthInviteEmailHtml(organization.name, link, identity.branding, identity.style)
            : getAuthConfirmationEmailHtml(link, identity.branding, identity.style)
        const result = await EmailService.send({
            to: owner.email!, subject: `Activa tu acceso - ${organization.name}`, html, organizationId: sender,
            tags: [{ name: 'type', value: 'organization_invitation' }, { name: 'new_org_id', value: organization.id }]
        })
        if (!result.success) throw new Error('El correo de activación no pudo ser enviado.')
    } catch (error) {
        deliveryError = error instanceof Error ? error.message : 'No se pudo enviar la activación.'
    }
    const { error: savedError } = await supabaseAdmin.rpc('finish_tenant_activation', {
        p_organization_id: organizationId, p_claim_id: claim.claim_id, p_error: deliveryError
    })
    if (savedError) return { sent: !deliveryError, error: deliveryError || 'Correo enviado; no se pudo guardar el resultado del envío.' }
    return { sent: !deliveryError, error: deliveryError || undefined }
}
