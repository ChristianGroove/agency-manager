'use server'

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import type { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import type { Briefing as DetailedBriefing } from "@/types/briefings"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

/**
 * Core Data Fetcher for the Portal
 * Handles Client, Staff, and Guest contexts
 */
export async function getPortalData(token: string) {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        // 1. Try finding a CLIENT first
        let clientQuery = supabaseAdmin.from('leads').select('*')
        if (isUuid) {
            clientQuery = clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            clientQuery = clientQuery.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await clientQuery.maybeSingle()

        // 2. Client Flow
        if (client) {
            if (client.portal_token_never_expires !== true) {
                if (client.portal_token_expires_at && new Date(client.portal_token_expires_at) < new Date()) {
                    throw new Error('PORTAL_TOKEN_EXPIRED')
                }
            }

            const { data: orgData } = await supabaseAdmin
                .from('organizations')
                .select('active_app_id, saas_apps(portal_template)')
                .eq('id', client.organization_id)
                .single()

            const portalTemplate = (orgData?.saas_apps as any)?.portal_template || 'b2b_dashboard'
            const { data: rawSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('*')
                .eq('organization_id', client.organization_id)
                .single()

            const branding = await getEffectiveBranding(client.organization_id)

            const settings = {
                ...(rawSettings || {}),
                agency_name: branding.name,
                portal_logo_url: branding.logos.main_light || branding.logos.main || branding.logos.portal,
                isotipo_url: branding.logos.favicon,
                portal_login_background_url: branding.logos.login_bg,
                portal_primary_color: branding.colors.primary,
                portal_secondary_color: branding.colors.secondary,
                portal_template: portalTemplate
            }

            const isB2B = portalTemplate === 'b2b_dashboard'
            const isB2C = portalTemplate === 'b2c_commerce'

            const [
                { data: invoices },
                { data: quotes },
                { data: briefings },
                { data: events },
                { data: services },
                { data: hostingAccounts },
                { data: paymentMethods },
                { data: appPortalConfig },
                { data: catalogItems }
            ] = await Promise.all([
                supabaseAdmin.from('invoices').select('*').eq('client_id', client.id).is('deleted_at', null).neq('status', 'cancelled').order('created_at', { ascending: false }),
                isB2B ? supabaseAdmin.from('quotes').select('*')
                    .or(`client_id.eq.${client.id},lead_id.eq.${client.id}`)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
                isB2B ? supabaseAdmin.from('briefings').select('*, template:briefing_templates(name)').eq('client_id', client.id).eq('organization_id', client.organization_id).is('deleted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
                isB2B ? supabaseAdmin.from('client_events').select('*').eq('client_id', client.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
                isB2B ? supabaseAdmin.from('services').select('*').eq('client_id', client.id).eq('status', 'active').is('deleted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
                isB2B ? supabaseAdmin.from('hosting_accounts').select('*').eq('client_id', client.id).eq('status', 'active').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
                supabaseAdmin.from('organization_payment_methods').select('*').eq('organization_id', client.organization_id).eq('is_active', true).order('display_order', { ascending: true }),
                supabaseAdmin.from('saas_apps_portal_config').select('*').eq('app_id', orgData?.active_app_id || '').eq('is_enabled', true).eq('target_portal', 'client').order('display_order', { ascending: true }),
                isB2C ? supabaseAdmin.from('service_catalog').select('*').eq('organization_id', client.organization_id).eq('is_visible_in_portal', true) : Promise.resolve({ data: [] })
            ])

            // Hierarchical Module Resolution
            const portalConfig = client.portal_config || { enabled: true, modules: {} }
            const globalModules = settings.portal_modules || {}

            const resolveModuleVisibility = (key: string, autoLogic: () => boolean): boolean => {
                let globalKey = key
                if (key === 'billing') globalKey = 'invoices'
                if (key === 'services') globalKey = 'briefings'

                if (key === 'billing') {
                    if (globalModules.invoices === false && globalModules.payments === false) return false
                } else {
                    if (globalModules[globalKey] === false) return false
                }

                if (portalConfig.enabled === false) return false

                const clientMode = portalConfig.modules?.[key]?.mode || 'auto'
                if (clientMode === 'on') return true
                if (clientMode === 'off') return false

                return autoLogic()
            }

            const showHosting = resolveModuleVisibility('hosting', () => !!(hostingAccounts && hostingAccounts.length > 0))
            const showServices = resolveModuleVisibility('services', () => {
                const hasServices = services && services.length > 0
                const hasBriefings = briefings && briefings.length > 0
                return !!(hasServices || hasBriefings)
            })
            const showBilling = resolveModuleVisibility('billing', () => {
                const hasInvoices = invoices && invoices.length > 0
                const hasQuotes = quotes && quotes.length > 0
                return !!(hasInvoices || hasQuotes)
            })

            const filteredServices = (services || []).filter((service: Service) => {
                if (service.type === 'one_off') {
                    const hasPendingOrOverdue = invoices?.some(inv =>
                        inv.service_id === service.id &&
                        (inv.status === 'pending' || inv.status === 'overdue')
                    )
                    return !!hasPendingOrOverdue
                }
                return true
            })

            const showInsights = isB2B && resolveModuleVisibility('insights', () => {
                const activeServices = services || []
                const organicKeywords = ['social media', 'community', 'redes', 'content', 'orgánico', 'organico']
                const adsKeywords = ['ads', 'pauta', 'trafficker', 'publicidad', 'meta', 'google', 'campaign']

                return activeServices.some(s => {
                    const name = (s.name || '').toLowerCase()
                    const access = s.insights_access
                    if (access === 'ORGANIC' || access === 'ADS' || access === 'ALL') return true
                    return organicKeywords.some(k => name.includes(k)) || adsKeywords.some(k => name.includes(k))
                })
            })

            let computedModules: Array<{ slug: string, portal_tab_label: string, portal_icon_key: string }> = []
            if (appPortalConfig && appPortalConfig.length > 0) {
                computedModules = appPortalConfig
                    .filter(mod => {
                        const key = mod.portal_component_key || mod.module_slug
                        if (key === 'billing') return showBilling
                        if (key === 'services') return showServices
                        if (key === 'hosting') return showHosting
                        if (key === 'insights') return showInsights
                        if (key === 'summary') return resolveModuleVisibility('summary', () => true)
                        return true
                    })
                    .map(mod => ({
                        slug: mod.module_slug,
                        portal_tab_label: mod.portal_tab_label,
                        portal_icon_key: mod.portal_icon_key
                    }))
            } else {
                if (resolveModuleVisibility('summary', () => true)) computedModules.push({ slug: 'core_summary', portal_tab_label: 'Resumen', portal_icon_key: 'Layout' })
                if (showBilling) computedModules.push({ slug: 'module_invoicing', portal_tab_label: 'Facturación', portal_icon_key: 'CreditCard' })
                if (showServices) computedModules.push({ slug: 'core_services', portal_tab_label: 'Servicios', portal_icon_key: 'Briefcase' })
                if (showHosting) computedModules.push({ slug: 'core_hosting', portal_tab_label: 'Hosting', portal_icon_key: 'Server' })
                if (resolveModuleVisibility('catalog', () => true)) computedModules.push({ slug: 'module_catalog', portal_tab_label: 'Explorar', portal_icon_key: 'Globe' })
                if (showInsights) computedModules.push({ slug: 'meta_insights', portal_tab_label: 'Insights', portal_icon_key: 'BarChart' })
            }

            return {
                type: 'client',
                client: client as Client,
                invoices: (invoices || []) as Invoice[],
                quotes: (quotes || []) as Quote[],
                briefings: (briefings || []) as Briefing[],
                events: (events || []) as ClientEvent[],
                settings: settings,
                services: filteredServices as Service[],
                hostingAccounts: (hostingAccounts || []) as any[],
                activePortalModules: computedModules,
                paymentMethods: (paymentMethods || []),
                catalog: catalogItems || [],
                insightsAccess: {
                    show: !!showInsights,
                    mode: { organic: true, ads: true }
                }
            }
        }

        // 3. Staff Flow
        if (!client && isUuid) {
            const { data: staff } = await supabaseAdmin
                .from('cleaning_staff_profiles')
                .select('*')
                .eq('access_token', token)
                .is('deleted_at', null)
                .maybeSingle()

            if (staff) {
                const { data: settings } = await supabaseAdmin
                    .from('organization_settings')
                    .select('*')
                    .eq('organization_id', staff.organization_id)
                    .single()

                const startOfDay = new Date()
                startOfDay.setHours(0, 0, 0, 0)

                const { data: rawJobs } = await supabaseAdmin
                    .from('appointments')
                    .select('*')
                    .eq('staff_id', staff.id)
                    .gte('start_time', startOfDay.toISOString())
                    .order('start_time', { ascending: true })

                const jobs = await Promise.all((rawJobs || []).map(async (job) => {
                    const [clientRes, serviceRes] = await Promise.all([
                        job.client_id ? supabaseAdmin.from('leads').select('id, name, phone, address').eq('id', job.client_id).maybeSingle() : Promise.resolve({ data: null }),
                        job.service_id ? supabaseAdmin.from('cleaning_services').select('id, name, estimated_duration_minutes').eq('id', job.service_id).maybeSingle() : Promise.resolve({ data: null })
                    ])
                    return {
                        ...job,
                        client: clientRes.data,
                        service: serviceRes.data
                    }
                }))

                return { type: 'staff', staff, settings: settings || {}, jobs: jobs || [] }
            }

            // Attendance Staff
            const { data: retailStaff } = await supabaseAdmin
                .from('organization_staff')
                .select('*, organization_locations(*)')
                .eq('access_token', token)
                .is('is_active', true)
                .maybeSingle()

            if (retailStaff) {
                const { data: settings } = await supabaseAdmin
                    .from('organization_settings')
                    .select('*')
                    .eq('organization_id', retailStaff.organization_id)
                    .single()

                const branding = await getEffectiveBranding(retailStaff.organization_id)
                const effectiveSettings = {
                    ...(settings || {}),
                    agency_name: branding.name,
                    portal_logo_url: branding.logos.main_light || branding.logos.main || branding.logos.portal,
                    isotipo_url: branding.logos.favicon,
                    portal_login_background_url: branding.logos.login_bg,
                    portal_primary_color: branding.colors.primary,
                    portal_secondary_color: branding.colors.secondary
                }
                return { type: 'attendance_staff', staff: retailStaff, settings: effectiveSettings }
            }
        }

        // 4. Guest Flow
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .eq('slug', token)
            .single()

        if (org) {
            const { data: rawSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('*')
                .eq('organization_id', org.id)
                .single()

            const branding = await getEffectiveBranding(org.id)
            const settings = {
                ...(rawSettings || {}),
                agency_name: branding.name,
                portal_logo_url: branding.logos.main_light || branding.logos.main || branding.logos.portal,
                isotipo_url: branding.logos.favicon,
                portal_login_background_url: branding.logos.login_bg,
                portal_primary_color: branding.colors.primary,
                portal_secondary_color: branding.colors.secondary
            }

            const { data: appData } = await supabaseAdmin
                .from('saas_apps')
                .select('portal_template')
                .eq('id', org.active_app_id || '')
                .single()

            const portalTemplate = appData?.portal_template || 'b2b_dashboard'
            settings.portal_template = portalTemplate

            const [ { data: appPortalConfig }, { data: catalogItems } ] = await Promise.all([
                supabaseAdmin.from('saas_apps_portal_config').select('*').eq('app_id', org.active_app_id || '').eq('is_enabled', true).eq('target_portal', 'client').order('display_order', { ascending: true }),
                (portalTemplate === 'b2c_commerce') ? supabaseAdmin.from('service_catalog').select('*').eq('organization_id', org.id).eq('is_visible_in_portal', true) : Promise.resolve({ data: [] })
            ])

            let computedModules: Array<{ slug: string, portal_tab_label: string, portal_icon_key: string }> = []
            if (appPortalConfig && appPortalConfig.length > 0) {
                computedModules = appPortalConfig.map(mod => ({
                    slug: mod.module_slug,
                    portal_tab_label: mod.portal_tab_label,
                    portal_icon_key: mod.portal_icon_key
                }))
            }

            return {
                type: 'guest',
                client: null,
                organization: org,
                settings: settings || {},
                activePortalModules: computedModules,
                invoices: [], quotes: [], briefings: [], events: [], services: [], hostingAccounts: [], paymentMethods: [],
                catalog: catalogItems || [],
                insightsAccess: { show: false, mode: { organic: false, ads: false } }
            }
        }

        throw new Error('Invalid token or not found')
    } catch (error) {
        console.error('getPortalData Error:', error)
        throw error
    }
}

/**
 * Lightweight fetch for metadata only (Branding/Settings)
 */
export async function getPortalMetadata(token: string) {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let organizationId: string | null = null
        let isAttendance = false

        if (isUuid) {
            const { data: staff } = await supabaseAdmin.from('organization_staff').select('organization_id').eq('access_token', token).maybeSingle()
            if (staff) {
                organizationId = staff.organization_id
                isAttendance = true
            }
        }

        if (!organizationId) {
            let clientQuery = supabaseAdmin.from('leads').select('organization_id')
            if (isUuid) clientQuery = clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
            else clientQuery = clientQuery.eq('portal_short_token', token)
            const { data: client } = await clientQuery.maybeSingle()
            if (client) organizationId = client.organization_id
        }

        if (!organizationId) {
            const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('slug', token).maybeSingle()
            if (org) organizationId = org.id
        }

        if (!organizationId) return {}

        const { data: settings } = await supabaseAdmin.from('organization_settings').select('*').eq('organization_id', organizationId).single()
        return { ...(settings || {}), isAttendance }
    } catch {
        return {}
    }
}

/**
 * Fetch specific portal resources
 */
export async function getPortalBriefing(token: string, briefingId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    let query = supabaseAdmin.from('leads').select('id')
    if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    else query = query.eq('portal_short_token', token)
    const { data: client, error: clientError } = await query.single()
    if (clientError || !client) throw new Error('Unauthorized')

    const { data, error } = await supabaseAdmin
        .from('briefings')
        .select('*, template:briefing_templates(id, name, description, structure), client:leads(name, email)')
        .eq('id', briefingId)
        .eq('client_id', client.id)
        .single()

    if (error) throw error
    return data as DetailedBriefing
}

export async function getPortalBriefingResponses(token: string, briefingId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    let query = supabaseAdmin.from('leads').select('id')
    if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    else query = query.eq('portal_short_token', token)
    const { data: client, error: clientError } = await query.single()
    if (clientError || !client) throw new Error('Unauthorized')

    const { data, error } = await supabaseAdmin.from('briefing_responses').select('*').eq('briefing_id', briefingId)
    if (error) throw error
    return data || []
}

export async function getPortalCatalog(token: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    let clientQuery = supabaseAdmin.from('leads').select('id, organization_id')
    if (isUuid) clientQuery = clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    else clientQuery = clientQuery.eq('portal_short_token', token)
    const { data: client } = await clientQuery.maybeSingle()

    let organizationId: string | null = client?.organization_id || null
    if (!organizationId) {
        const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('slug', token).maybeSingle()
        if (org) organizationId = org.id
    }

    if (!organizationId) throw new Error('Unauthorized')

    const [ { data: catalogItems }, { data: categories } ] = await Promise.all([
        supabaseAdmin.from('service_catalog').select('*').eq('organization_id', organizationId).eq('is_visible_in_portal', true),
        supabaseAdmin.from('service_categories').select('id, name').eq('organization_id', organizationId)
    ])

    const categoryMap = (categories || []).reduce((acc: Record<string, string>, cat) => {
        acc[cat.id] = cat.name
        return acc
    }, {})

    const itemsWithName = (catalogItems || []).map(item => ({
        ...item,
        category: categoryMap[item.category] || item.category
    }))

    return itemsWithName.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
}

export async function getPortalQuote(token: string, quoteId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    let query = supabaseAdmin.from('leads').select('id, organization_id')
    if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    else query = query.eq('portal_short_token', token)

    const { data: client, error: clientError } = await query.single()
    if (clientError || !client) throw new Error('Unauthorized')

    const { data, error } = await supabaseAdmin
        .from('quotes')
        .select('*, client:leads!client_id (*), lead:leads!lead_id (*), emitter:emitters (*)')
        .eq('id', quoteId)
        .or(`client_id.eq.${client.id},lead_id.eq.${client.id}`)
        .single()

    if (error) throw error

    if (!data.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_default', true).maybeSingle()
        data.emitter = defaultEmitter || await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_active', true).limit(1).maybeSingle().then(r => r.data)
    }

    return data as Quote
}

export async function getPortalInvoice(token: string, invoiceId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    let query = supabaseAdmin.from('leads').select('id, organization_id')
    if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    else query = query.eq('portal_short_token', token)

    const { data: client, error: clientError } = await query.single()
    if (clientError || !client) throw new Error('Unauthorized')

    const { data, error } = await supabaseAdmin
        .from('invoices')
        .select('*, client:leads (*), emitter:emitters (*)')
        .eq('id', invoiceId)
        .eq('client_id', client.id)
        .is('deleted_at', null)
        .single()

    if (error) throw error

    if (!data.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_default', true).maybeSingle()
        data.emitter = defaultEmitter || await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_active', true).limit(1).maybeSingle().then(r => r.data)
    }

    return data as Invoice
}
