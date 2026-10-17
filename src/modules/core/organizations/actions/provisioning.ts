"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { isSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { getCurrentOrganizationId, getUserOrganizations, getCurrentOrgDetails } from "./crud"
import { switchOrganization } from "./context"
import { DEFAULT_REAL_ESTATE_CATEGORIES } from "../vertical-registry"
import { resolveOnboardingContext } from "../services/onboarding-context"
import { createHash } from 'node:crypto'
import { getDefaultRoles } from '@/modules/core/iam/services/default-roles'
import { CRMTemplates } from '@/modules/features/crm/services/logic/templates-shared'
import { resolveTenantOwner, sendTenantActivation } from '../services/tenant-activation'
import type { InviteValidationResult } from "@/modules/core/iam/actions/invitation-actions"

/**
 * Create a new Organization (Tenant Provisioning)
 */
type OrganizationCreationInput = {
    name: string
    slug: string
    logo_url?: string
    app_id: string
    parent_organization_id?: string | null
    organization_type?: 'platform' | 'reseller' | 'operator' | 'client'
    admin_email?: string
    acquired_by_reseller_id?: string | null
}

export async function createOrganization(formData: OrganizationCreationInput) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    if (!(await isSuperAdmin(user.id))) {
        const currentOrgId = await getCurrentOrganizationId()
        const organizations = await getUserOrganizations()
        const reseller = organizations.find(member =>
            member.organization_id === currentOrgId &&
            member.organization?.organization_type === 'reseller' &&
            member.status !== 'blocked' && ['owner', 'admin'].includes(member.role)
        )
        if (!reseller || (formData.organization_type && formData.organization_type !== 'client')) {
            return { success: false, error: 'No tienes permiso para aprovisionar esta organización.' }
        }
        // A reseller can provision only within their own network.
        formData = { ...formData, parent_organization_id: reseller.organization_id, acquired_by_reseller_id: reseller.organization_id }
    }
    return provisionOrganization(formData)
}

async function provisionOrganization(formData: OrganizationCreationInput, onboardingInvite?: NonNullable<InviteValidationResult['invitation']>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    formData = { ...formData, name: formData.name.trim(), slug: formData.slug.trim().toLowerCase(), admin_email: formData.admin_email?.trim().toLowerCase() || undefined }
    if (!formData.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
        return { success: false, error: 'Ingresa un nombre y un identificador válido (letras, números y guiones).' }
    }
    if (formData.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
        return { success: false, error: 'Formato de email inválido' }
    }

    const creatorOrgId = await getCurrentOrganizationId()

    try {
        // Public creation validates administrator authority. Autonomous creation
        // receives only a server-validated invitation; the DB rechecks both paths.
        if (onboardingInvite) {
            formData.organization_type = onboardingInvite.target_organization_type || 'client'
            formData.parent_organization_id = onboardingInvite.reseller_org_id
            formData.acquired_by_reseller_id = onboardingInvite.reseller_org_id
        }

        let computedParentId: string | null = null

        if (formData.parent_organization_id) {
            computedParentId = formData.parent_organization_id
        } else {
            let creatorType = null;
            if (creatorOrgId && !onboardingInvite) {
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
            } else if (!computedParentId && (newOrgType === 'client' || (!!onboardingInvite && newOrgType === 'reseller'))) {
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

        // Determine space category from app
        let appCategory: string | null = null
        if (formData.app_id) {
            const { data: appData, error: appError } = await supabaseAdmin
                .from('saas_apps')
                .select('category, space_category, slug')
                .eq('id', formData.app_id)
                .eq('is_active', true)
                .maybeSingle()
            if (appError || !appData) return { success: false, error: 'El espacio seleccionado no está disponible.' }
            const appRecord = appData as { space_category?: string; category?: string; slug?: string }
            appCategory = appRecord.space_category || appRecord.category || null
            if (!appCategory && (appRecord.slug === 'real-estate-pro' || appRecord.slug === 'real_estate')) {
                appCategory = 'real_estate'
            }
        }
        const isRealEstate = appCategory === 'real_estate' || 
            formData.app_id === 'app_real_estate_pro' || 
            formData.app_id === 'real-estate-pro' ||
            formData.app_id === 'real_estate'

        // Stable per actor/input, including across browser tabs and lost responses.
        const requestInput = {
            name: formData.name, slug: formData.slug, app_id: formData.app_id,
            logo_url: formData.logo_url || null, admin_email: formData.admin_email || null,
            organization_type: formData.organization_type || 'client', parent_organization_id: computedParentId,
            acquired_by_reseller_id: formData.acquired_by_reseller_id || null
        }
        const requestKey = onboardingInvite ? `onboarding:${user.id}` :
            createHash('sha256').update(JSON.stringify(requestInput)).digest('hex')
        const owner = formData.admin_email ? await resolveTenantOwner(formData.admin_email) : null
        const templateId = isRealEstate ? 'real_estate' : (appCategory || 'agency')
        const crmTemplate = CRMTemplates[templateId] || CRMTemplates.agency
        const defaultPortalThemeConfig = isRealEstate ? {
            industry_preset: 'real_estate',
            widget_config: {
                show_real_estate_filters: true, show_mortgage_calculator: true,
                show_cart_drawer: false, show_whatsapp_button: true, show_category_nav: true,
                show_search_bar: true, show_stock_badges: false
            }
        } : {}
        const resolvedRoles = process.env.VITEST
            ? getDefaultRoles()
            : (await (await import('@/modules/core/iam/actions/superadmin-iam-actions')).getResolvedGlobalBaseRoles()).map(r => ({
                name: r.name,
                description: r.description,
                is_system_role: true,
                hierarchy_level: r.hierarchy_level,
                permissions: r.permissions,
            }))
        const { data: provisioned, error: provisionError } = await supabaseAdmin.rpc('provision_tenant_atomic', {
            p_actor_id: user.id, p_request_key: requestKey,
            p_input: requestInput, p_owner_id: owner?.id || (onboardingInvite ? user.id : null),
            p_invite_code: onboardingInvite?.code || null,
            p_defaults: {
                roles: resolvedRoles, portal_theme_config: defaultPortalThemeConfig,
                categories: isRealEstate ? DEFAULT_REAL_ESTATE_CATEGORIES : [], crm: crmTemplate
            }
        })
        if (provisionError || !provisioned?.organization) {
            if (provisionError?.code === '23505') return { success: false, error: 'Este identificador ya está ocupado. Elige otro para la organización.' }
            throw new Error(provisionError?.message || 'No se pudo crear la organización. Intenta de nuevo.')
        }
        const newOrg = provisioned.organization as { id: string; name: string; slug: string }
        const delivery = formData.admin_email
            ? await sendTenantActivation(newOrg.id, creatorOrgId)
            : { sent: false, error: undefined }
        return {
            success: true,
            data: { ...newOrg, invitation_sent: delivery.sent, invitation_error: delivery.error }
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
    return completeOrganizationOnboarding({ name: formData.name, slug: formData.slug, app_id: formData.app_id })
}

/** Resolve activation vs. autonomous creation from verified memberships. */
export async function getOnboardingContext() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false as const, error: 'Inicia sesión para continuar.' }
        return { success: true as const, data: await resolveOnboardingContext(user) }
    } catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo cargar tu cuenta.' }
    }
}

export async function completeOrganizationOnboarding(input: {
    name?: string; slug?: string; app_id?: string; password?: string; confirmPassword?: string; fullName?: string
}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Inicia sesión para continuar.' }
        const context = await resolveOnboardingContext(user)

        if (context.requiresPassword && !input.password) {
            return { success: false, error: 'Crea una contraseña para activar tu acceso.' }
        }
        if (input.password) {
            if (input.password.length < 6 || input.password !== input.confirmPassword) {
                return { success: false, error: 'La contraseña debe tener al menos 6 caracteres y ambas deben coincidir.' }
            }
            const { updatePassword } = await import('@/modules/core/auth/actions')
            const passwordData = new FormData()
            passwordData.set('password', input.password)
            const result = await updatePassword(passwordData)
            if (!result.success) return result
        }

        let organizationId = context.organization?.id
        if (!organizationId) {
            if (!input.name?.trim() || !input.slug || !input.app_id || !context.invitation) {
                return { success: false, error: 'Completa el nombre, identificador y espacio de tu organización.' }
            }
            // Scope is supplied only by the validated server-side invitation.
            const result = await provisionOrganization({
                name: input.name, slug: input.slug, app_id: input.app_id,
                organization_type: context.invitation.target_organization_type || 'client'
            }, context.invitation)
            if (!result.success || !result.data) return { success: false, error: result.error || 'No se pudo crear tu organización.' }
            organizationId = result.data.id
        }

        if (!organizationId) throw new Error('No se pudo determinar la organización creada. Intenta de nuevo.')
        await switchOrganization(organizationId)
        // Password setup may have refreshed cookies through another server client.
        const sessionClient = await createClient()
        const { error } = await sessionClient.auth.updateUser({ data: {
            onboarding_completed: true,
            ...(input.fullName?.trim() ? { full_name: input.fullName.trim() } : {})
        } })
        if (error) throw error
        if (input.fullName?.trim()) {
            const results = await Promise.all([
                supabaseAdmin.from('profiles').upsert({ id: user.id, full_name: input.fullName.trim() }, { onConflict: 'id' }),
                supabaseAdmin.from('organization_members').update({ full_name: input.fullName.trim() }).eq('user_id', user.id)
            ])
            if (results.some(result => result.error)) console.warn('Onboarding: profile name could not be synchronized')
        }
        // Admin provisioning and auth metadata updates must also reach the browser's JWT/cookies.
        const { error: refreshError } = await sessionClient.auth.refreshSession()
        if (refreshError) throw refreshError
        return { success: true, organizationId }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo completar la activación. Intenta de nuevo.' }
    }
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
    const { data } = await supabaseAdmin
        .from('organizations')
        .select(`
            active_app_id,
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
        .maybeSingle()

    const manualModules = Array.isArray(data?.manual_module_overrides)
        ? (data.manual_module_overrides as string[])
        : []
    const spaceModules: string[] = []
    const productModules: string[] = []

    if (data?.active_app_id) {
        const { data: appModules } = await supabaseAdmin
            .from('saas_app_modules')
            .select('module_key')
            .eq('app_id', data.active_app_id)
            .eq('auto_enable', true)

        if (appModules) {
            appModules.forEach((m: any) => {
                if (m?.module_key) spaceModules.push(m.module_key)
            })
        }
    }

    if (data?.subscription_product && Array.isArray((data.subscription_product as any).modules)) {
        const modules = (data.subscription_product as any).modules
        modules.forEach((m: any) => {
            if (m.system_module?.key) {
                productModules.push(m.system_module.key)
            }
        })
    }

    const coreModules = ['core_clients', 'core_settings']
    return Array.from(new Set([...coreModules, ...spaceModules, ...manualModules, ...productModules]))
}

