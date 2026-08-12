"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { isSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { getAuthRedirectBase } from "@/modules/core/iam/services/auth-utils"
import { getSecureAuthLink } from "@/modules/core/iam/services/auth-link-utils"
import { getAuthInviteEmailHtml, getAuthConfirmationEmailHtml } from "@/modules/infrastructure/notifications/services/email-templates"
import { EmailService } from "@/modules/features/notifications/email.service"
import { getCurrentOrganizationId, getUserOrganizations, getCurrentOrgDetails } from "./crud"
import { switchOrganization } from "./context"

/**
 * Create a new Organization (Tenant Provisioning)
 */
export async function createOrganization(formData: {
    name: string
    slug: string
    logo_url?: string
    app_id: string
    parent_organization_id?: string
    organization_type?: 'platform' | 'reseller' | 'operator' | 'client'
    admin_email?: string
    acquired_by_reseller_id?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    const creatorOrgId = await getCurrentOrganizationId()

    if (!creatorOrgId && formData.organization_type !== 'client') {
        return { success: false, error: 'No se pudo determinar la organización del creador' }
    }

    try {
        // V2: Verify Parent Permission
        if (formData.parent_organization_id) {
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('organization_id', formData.parent_organization_id)
                .single()

            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return { success: false, error: "No tienes permiso para crear sub-organizaciones en esta cuenta." }
            }
        } else {
            const isAdmin = await isSuperAdmin(user.id)

            if (formData.organization_type && formData.organization_type !== 'client') {
                if (!isAdmin) {
                    return { success: false, error: "No tienes permiso para crear este tipo de organización." }
                }
            } else {
                if (!isAdmin) {
                    const memberships = await getUserOrganizations()
                    const isReseller = memberships.some(m => m.organization?.organization_type === 'reseller' && ['owner', 'admin'].includes(m.role))

                    if (!isReseller) {
                        const isClientMember = memberships.some(m => m.organization?.organization_type === 'client');
                        if (isClientMember) {
                            return { success: false, error: "Tu plan actual no permite crear múltiples organizaciones. Contacta a soporte para un upgrade." }
                        }
                    }
                }
            }
        }

        let computedParentId: string | null = null

        if (formData.parent_organization_id) {
            computedParentId = formData.parent_organization_id
        } else {
            let creatorType = null;
            if (creatorOrgId) {
                const { data: creatorOrg } = await supabaseAdmin
                    .from('organizations')
                    .select('organization_type')
                    .eq('id', creatorOrgId)
                    .single()
                creatorType = creatorOrg?.organization_type
            }

            const newOrgType = formData.organization_type || 'client'

            if (creatorType === 'platform') {
                computedParentId = creatorOrgId
            } else if (creatorType === 'reseller' && newOrgType === 'client') {
                computedParentId = creatorOrgId
            } else if (!computedParentId && newOrgType === 'client') {
                const { data: platformOrg } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('organization_type', 'platform')
                    .single()

                if (platformOrg) {
                    computedParentId = platformOrg.id
                }
            }
        }

        let attempts = 0;
        const maxAttempts = 5;
        let finalSlug = formData.slug;
        let newOrg = null;
        let orgError = null;

        let subscriptionProductId = null;
        const { data: defaultProduct } = await supabaseAdmin
            .from('saas_products')
            .select('id')
            .order('is_active', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        subscriptionProductId = defaultProduct?.id;

        const resellerOrgIdFromMeta = user?.user_metadata?.reseller_org_id
        const inviteCodeFromMeta = user?.user_metadata?.invited_by_code
        const targetResellerId = formData.acquired_by_reseller_id || resellerOrgIdFromMeta || null

        while (attempts < maxAttempts) {
            const { data, error } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: formData.name,
                    slug: finalSlug,
                    logo_url: formData.logo_url,
                    active_app_id: formData.app_id,
                    app_activated_at: new Date().toISOString(),
                    subscription_product_id: subscriptionProductId,
                    subscription_status: 'active',
                    parent_organization_id: computedParentId,
                    organization_type: formData.organization_type || 'client',
                    status: 'active',
                    acquired_by_reseller_id: targetResellerId,
                    acquisition_date: targetResellerId ? new Date().toISOString() : null
                })
                .select()
                .single()

            if (error) {
                if (error.code === '23505' && error.message.includes('slug')) {
                    attempts++;
                    const suffix = Math.random().toString(36).substring(2, 6);
                    finalSlug = `${formData.slug}-${suffix}`;
                    continue;
                } else {
                    orgError = error;
                    break;
                }
            } else {
                newOrg = data;
                break;
            }
        }

        if (orgError) throw orgError;
        if (!newOrg) throw new Error("No se pudo generar un slug único para la organización tras varios intentos.");

        if (inviteCodeFromMeta) {
            try {
                const { consumeInviteCode } = await import('@/modules/core/iam/actions/invitation-actions')
                await consumeInviteCode(inviteCodeFromMeta)
            } catch (invErr) {
                console.error("Warning: Failed to consume invite code", invErr)
            }
        }

        // Track who provisioned this organization (always)
        await supabaseAdmin.from('organizations')
            .update({ provisioned_by: user.id })
            .eq('id', newOrg.id)

        const shouldAddCreator = !formData.admin_email

        if (shouldAddCreator) {
            // Determine if the creator is a privileged user (SuperAdmin/Reseller)
            // who is provisioning on behalf of someone else, vs a self-service user
            let creatorType: string | null = null
            if (creatorOrgId) {
                const { data: cOrg } = await supabaseAdmin
                    .from('organizations')
                    .select('organization_type')
                    .eq('id', creatorOrgId)
                    .single()
                creatorType = cOrg?.organization_type || null
            }

            const isPrivilegedCreator = creatorType === 'platform' || creatorType === 'reseller'

            if (isPrivilegedCreator) {
                // SuperAdmin/Reseller: add as admin proxy, NOT as owner
                // The real owner will be assigned when they accept or are invited
                const { error: memberError } = await supabaseAdmin
                    .from('organization_members')
                    .insert({
                        organization_id: newOrg.id,
                        user_id: user.id,
                        role: 'admin',
                        permissions: { is_support_proxy: true, provisioner: true }
                    })
                if (memberError) throw memberError
                // owner_id stays null — no real owner yet
            } else {
                // Self-service user: they ARE the owner of the organization
                const { error: memberError } = await supabaseAdmin
                    .from('organization_members')
                    .insert({
                        organization_id: newOrg.id,
                        user_id: user.id,
                        role: 'owner'
                    })
                if (memberError) throw memberError
                await supabaseAdmin.from('organizations')
                    .update({ owner_id: user.id })
                    .eq('id', newOrg.id)
            }
        }

        try {
            const { seedDefaultRoles } = await import('@/modules/core/iam/services/role-service')
            await seedDefaultRoles(newOrg.id)
        } catch (e) {
            console.error("Warning: Failed to seed default roles", e)
        }

        // Seed default organization_settings and saas_subscriptions
        try {
            await supabaseAdmin.from('organization_settings').insert({
                organization_id: newOrg.id,
                agency_name: newOrg.name
            })
        } catch (e) {
            console.error("Warning: Failed to seed organization_settings", e)
        }

        try {
            if (!formData.app_id) {
                console.error("Warning: No app_id provided for saas_subscription, skipping subscription seed")
            } else {
                await supabaseAdmin.from('saas_subscriptions').insert({
                    organization_id: newOrg.id,
                    plan_id: formData.app_id,
                    status: 'active',
                    payment_gateway: 'manual',
                    current_period_start: new Date().toISOString()
                })
            }
        } catch (e) {
            console.error("Warning: Failed to seed saas_subscriptions", e)
        }

        let invitationSent = false
        let invitationError: string | undefined

        if (formData.admin_email) {
            try {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(formData.admin_email)) {
                    invitationError = 'Formato de email inválido'
                } else {
                    const { data: linkData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'invite',
                        email: formData.admin_email,
                        options: {
                            data: {
                                full_name: 'Admin',
                                invited_org_id: newOrg.id
                            },
                            redirectTo: `${getAuthRedirectBase()}/auth/confirm`
                        }
                    })

                    let invitedUser = linkData?.user
                    let inviteLink = ''

                    if (inviteError) {
                        if (inviteError.message.includes('already been registered') || inviteError.status === 422) {
                            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
                            const adminEmailLower = (formData.admin_email || "").toLowerCase()
                            const existingUser = (users || []).find((u: any) => u.email?.toLowerCase() === adminEmailLower)
                            
                            if (existingUser) {
                                invitedUser = existingUser
                                if (!existingUser.email_confirmed_at) {
                                    const { data: reLink, error: reError } = await supabaseAdmin.auth.admin.generateLink({
                                        type: 'magiclink',
                                        email: formData.admin_email as string,
                                        options: { redirectTo: `${getAuthRedirectBase()}/auth/confirm?next=/onboarding` }
                                    })
                                    if (!reError && (reLink as any).properties?.action_link) {
                                        inviteLink = getSecureAuthLink((reLink as any).properties.action_link, 'magiclink', getAuthRedirectBase(), '/onboarding')
                                    } else {
                                        inviteLink = `${getAuthRedirectBase()}/login`
                                    }
                                } else {
                                    inviteLink = `${getAuthRedirectBase()}/login`
                                }
                            } else {
                                invitationError = inviteError.message
                            }
                        } else {
                            invitationError = inviteError.message
                        }
                    } else if (linkData?.properties?.action_link) {
                        const actionLink = (linkData as any).properties?.action_link
                        const verificationType = (linkData as any).properties?.verification_type || 'invite'
                        inviteLink = getSecureAuthLink(actionLink, verificationType, getAuthRedirectBase(), '/update-password')
                    }

                    if (invitedUser && inviteLink) {
                        // Add invited user as the real owner
                        await supabaseAdmin.from('organization_members').insert({
                            organization_id: newOrg.id,
                            user_id: invitedUser.id,
                            role: 'owner'
                        })
                        await supabaseAdmin.from('organizations')
                            .update({ owner_id: invitedUser.id })
                            .eq('id', newOrg.id)

                        // Add the creator (SuperAdmin/Reseller) as admin proxy
                        // so they can manage/switch to this tenant
                        if (user.id !== invitedUser.id) {
                            await supabaseAdmin.from('organization_members').upsert({
                                organization_id: newOrg.id,
                                user_id: user.id,
                                role: 'admin',
                                permissions: { is_support_proxy: true, provisioner: true }
                            }, { onConflict: 'organization_id,user_id' })
                        }

                        await supabaseAdmin.auth.admin.updateUserById(invitedUser.id, {
                            user_metadata: { 
                                full_name: 'Admin',
                                onboarding_completed: false 
                            }
                        })

                        const identity = await (EmailService as any).getSenderIdentity(creatorOrgId || 'PLATFORM')
                        let emailHtml = ''
                        let emailSubject = `Invitación a ${formData.name}`
                        
                        if (invitedUser.email_confirmed_at) {
                            emailHtml = getAuthInviteEmailHtml(formData.name, inviteLink, identity.branding, identity.style)
                        } else {
                            emailSubject = `Activa tu cuenta - ${formData.name}`
                            emailHtml = getAuthConfirmationEmailHtml(inviteLink, identity.branding, identity.style)
                        }

                        const finalEmailResult = await EmailService.send({
                            to: formData.admin_email,
                            subject: emailSubject,
                            html: emailHtml,
                            organizationId: creatorOrgId || 'PLATFORM',
                            tags: [
                                { name: 'type', value: 'organization_invitation' },
                                { name: 'new_org_id', value: newOrg.id }
                            ]
                        })

                        if (finalEmailResult.success) {
                            invitationSent = true
                        } else {
                            invitationError = 'Email no pudo ser enviado'
                        }
                    }
                }
            } catch (inviteErr: any) {
                invitationError = inviteErr.message || 'Error desconocido al enviar invitación'
            }
        }

        await supabaseAdmin.rpc('assign_app_to_organization', {
            p_organization_id: newOrg.id,
            p_app_id: formData.app_id,
            p_enable_optional_modules: true
        })

        try {
            const { initializeOrganizationCRM } = await import('@/modules/features/crm/services/process-engine/init')
            await initializeOrganizationCRM(newOrg.id)
        } catch (initErr) {
            console.error("Warning: CRM Init failed", initErr)
        }

        // Only auto-switch to the new org if the creator is a self-service user
        // (i.e., they're the actual owner, not a SuperAdmin/Reseller provisioning on behalf of someone)
        if (shouldAddCreator) {
            let creatorType: string | null = null
            if (creatorOrgId) {
                const { data: cOrgSwitch } = await supabaseAdmin
                    .from('organizations')
                    .select('organization_type')
                    .eq('id', creatorOrgId)
                    .single()
                creatorType = cOrgSwitch?.organization_type || null
            }
            const isSelfService = creatorType !== 'platform' && creatorType !== 'reseller'
            if (isSelfService) {
                await switchOrganization(newOrg.id)
                await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { user_metadata: { onboarding_completed: true } }
                )
            }
        }

        return {
            success: true,
            data: {
                ...newOrg,
                invitation_sent: invitationSent,
                invitation_error: invitationError
            }
        }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Onboarding: Create a Client Organization (Strict)
 */
export async function createClientOrganization(formData: {
    name: string
    slug: string
    logo_url?: string
    app_id: string
    admin_email?: string
}) {
    return await createOrganization({
        ...formData,
        organization_type: 'client',
        parent_organization_id: undefined
    })
}

/**
 * Get tenant context for the indicator badge.
 */
export async function getTenantContext() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { getEffectiveBranding } = await import("@/modules/core/branding/actions")

    const [orgDetails, branding] = await Promise.all([
        getCurrentOrgDetails(),
        getEffectiveBranding(orgId)
    ])

    if (!orgDetails) return null

    const memberships = await getUserOrganizations()

    const isPrivileged = memberships.some(m =>
        (m.organization?.organization_type === 'reseller' || m.organization?.organization_type === 'platform') &&
        ['owner', 'admin'].includes(m.role)
    )

    const isPlatformAdmin = memberships.some(m =>
        m.organization?.organization_type === 'platform' &&
        ['owner', 'admin'].includes(m.role)
    )

    const currentOrgType = orgDetails.organization_type
    const isManagingDifferentContext =
        (isPlatformAdmin && (currentOrgType === 'reseller' || currentOrgType === 'client')) ||
        (isPrivileged && !isPlatformAdmin && currentOrgType === 'client')

    if (!isManagingDifferentContext) return null

    if (isManagingDifferentContext && currentOrgType === 'client') {
        const resellerMember = memberships.find(m => m.organization?.organization_type === 'reseller')
        const resellerOrgId = resellerMember?.organization_id

        if (resellerOrgId) {
            import("@/modules/billing/platform/revenue/actions").then(({ registerResellerActivity }) => {
                registerResellerActivity({
                    reseller_org_id: resellerOrgId,
                    client_org_id: orgId,
                    activity_type: 'support_session',
                    description: 'Sesión de soporte/seguimiento automática detectada vía Dashboard Switcher'
                })
            }).catch(err => console.error("Failed to log reseller activity:", err))
        }
    }

    return {
        name: orgDetails.name,
        color: branding?.colors?.primary || '#F205E2'
    }
}

/**
 * Get active modules for an organization
 */
export async function getOrganizationModules(organizationId: string): Promise<string[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('organizations')
        .select(`
            manual_module_overrides,
            subscription_product:saas_products!subscription_product_id (
                modules:saas_product_modules (
                    system_module:system_modules!module_id (
                        key
                    )
                )
            )
        `)
        .eq('id', organizationId)
        .single()

    const manualModules = (data?.manual_module_overrides as string[]) || []
    const productModules: string[] = []

    if (data?.subscription_product && Array.isArray((data.subscription_product as any).modules)) {
        const modules = (data.subscription_product as any).modules
        modules.forEach((m: any) => {
            if (m.system_module?.key) {
                productModules.push(m.system_module.key)
            }
        })
    }

    return Array.from(new Set([...manualModules, ...productModules]))
}
