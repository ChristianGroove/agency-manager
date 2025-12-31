'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Briefing as PortalBriefing } from "@/types/briefings"
import { getEffectiveBranding } from "@/modules/core/branding/actions"




// Internal fetch function (uncached) - Exported directly for live data
export async function getPortalData(token: string) {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        // ---------------------------------------------------------
        // 1. Try finding a CLIENT first (Existing Logic)
        // ---------------------------------------------------------
        let clientQuery = supabaseAdmin.from('clients').select('*')
        if (isUuid) {
            clientQuery = clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            clientQuery = clientQuery.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await clientQuery.maybeSingle()

        // ---------------------------------------------------------
        // 2. If CLIENT found, proceed with Client Portal flow
        // ---------------------------------------------------------
        if (client) {
            // First, fetch raw settings for functional flags
            const { data: rawSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('*')
                .eq('organization_id', client.organization_id)
                .single()

            // Fetch Effective Branding (White Label Awareness)
            const branding = await getEffectiveBranding(client.organization_id)

            // Merge Branding into Settings
            const settings = {
                ...(rawSettings || {}),
                agency_name: branding.name,
                portal_logo_url: branding.logos.portal,
                isotipo_url: branding.logos.favicon,
                portal_login_background_url: branding.logos.login_bg,
                // Map colors if used by portal (portal-layout.tsx might use inline styles or css vars, checking...)
                // Current portal-layout doesn't seem to use colors explicitly in the lines I saw, but let's map them for consistency
                portal_primary_color: branding.colors.primary,
                portal_secondary_color: branding.colors.secondary
            }

            // Fetch Related Data in Parallel
            const [
                { data: invoices },
                { data: quotes },
                { data: briefings },
                { data: events },
                { data: services }
            ] = await Promise.all([
                // Invoices: Filter out cancelled and deleted
                supabaseAdmin.from('invoices').select('*').eq('client_id', client.id).is('deleted_at', null).neq('status', 'cancelled').order('created_at', { ascending: false }),
                // Quotes: Add deleted_at filter
                supabaseAdmin.from('quotes').select('*').eq('client_id', client.id).is('deleted_at', null).order('created_at', { ascending: false }),
                // Briefings: Add deleted_at filter + organization_id for multi-tenant isolation
                supabaseAdmin.from('briefings').select('*, template:briefing_templates(name)').eq('client_id', client.id).eq('organization_id', client.organization_id).is('deleted_at', null).order('created_at', { ascending: false }),
                // Events: Add deleted_at filter
                supabaseAdmin.from('client_events').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
                // Services: Add deleted_at filter
                supabaseAdmin.from('services').select('*').eq('client_id', client.id).eq('status', 'active').is('deleted_at', null).order('created_at', { ascending: false })
            ])

            // Fetch portal modules (conditional based on super admin mode)
            let activePortalModules: Array<{
                slug: string
                portal_tab_label: string
                portal_icon_key: string
            }> = []

            if (settings?.show_all_portal_modules) {
                // Super Admin Mode: Load ALL portal modules
                const { data: allModules } = await supabaseAdmin
                    .from('system_modules')
                    .select('key, portal_tab_label, portal_icon_key, has_client_portal_view')
                    .eq('has_client_portal_view', true)

                activePortalModules = (allModules || [])
                    .filter(mod => mod && mod.portal_tab_label)
                    .map(mod => ({
                        slug: mod.key,
                        portal_tab_label: mod.portal_tab_label,
                        portal_icon_key: mod.portal_icon_key
                    }))
            } else {
                // Normal Mode: Load only subscription-based modules  
                const { data: productModules } = await supabaseAdmin
                    .from('saas_product_modules')
                    .select(`
                        module:system_modules!inner(
                            slug,
                            portal_tab_label,
                            portal_icon_key,
                            has_client_portal_view
                        )
                    `)
                    .eq('product_id', client.subscription_product_id || '')
                    .eq('system_modules.has_client_portal_view', true)

                activePortalModules = (productModules || [])
                    .map((pm: any) => pm.module)
                    .filter((mod: any) => mod && mod.portal_tab_label)
            }

            // Filter Services logic
            const filteredServices = (services || []).filter((service: Service) => {
                if (service.type === 'one_off') {
                    // One-off: Show ONLY if active AND has pending/overdue invoices
                    const hasPendingOrOverdue = invoices?.some(inv =>
                        inv.service_id === service.id &&
                        (inv.status === 'pending' || inv.status === 'overdue')
                    )
                    return hasPendingOrOverdue
                }
                // Recurring services are shown if active (already filtered by query)
                return true
            })

            // Fetch Active Payment Methods
            const { data: rawPaymentMethods } = await supabaseAdmin
                .from('organization_payment_methods')
                .select('*')
                .eq('organization_id', client.organization_id)
                .eq('is_active', true)
                .order('display_order', { ascending: true })

            // Map defaults if none found (Migration fallback during rollout)
            // If table is empty but old columns exist (handled by migration script already on DB side, 
            // but let's ensure we return SOMETHING if the migration user didn't run it yet? 
            // No, user said "listo", so table exists.

            const activePaymentMethods = rawPaymentMethods || []

            // ---------------------------------------------------------
            // SMART INSIGHTS LOGIC
            // ---------------------------------------------------------
            const portalInsightsSettings = client.portal_insights_settings || { override: null, access_level: 'NONE' }
            let showInsights = false
            let insightsMode = { organic: false, ads: false }

            if (portalInsightsSettings.override === true) {
                // Manual Enable
                showInsights = true
                const level = portalInsightsSettings.access_level || 'ALL'
                if (level === 'ALL') insightsMode = { organic: true, ads: true }
                if (level === 'ORGANIC') insightsMode = { organic: true, ads: false }
                if (level === 'ADS') insightsMode = { organic: false, ads: true }
            } else if (portalInsightsSettings.override === false) {
                // Manual Disable
                showInsights = false
                insightsMode = { organic: false, ads: false }
            } else {
                // Auto Mode (Default) - Check Services
                const activeServices = services || []

                // 1. Check for explicit "insights_access" tag
                let hasOrganicService = activeServices.some(s => s.insights_access === 'ORGANIC' || s.insights_access === 'ALL')
                let hasAdsService = activeServices.some(s => s.insights_access === 'ADS' || s.insights_access === 'ALL')

                // 2. Legacy Fallback: Check naming conventions if not found
                // This ensures existing services work without manual update
                if (!hasOrganicService && !hasAdsService) {
                    const organicKeywords = ['social media', 'community', 'redes', 'content', 'orgánico', 'organico']
                    const adsKeywords = ['ads', 'pauta', 'trafficker', 'publicidad', 'meta', 'google', 'campaign']

                    const legacyOrganic = activeServices.some(s => s.name && organicKeywords.some(k => s.name.toLowerCase().includes(k)))
                    const legacyAds = activeServices.some(s => s.name && adsKeywords.some(k => s.name.toLowerCase().includes(k)))

                    if (legacyOrganic) hasOrganicService = true
                    if (legacyAds) hasAdsService = true
                }

                if (hasOrganicService || hasAdsService) {
                    showInsights = true
                    insightsMode = { organic: hasOrganicService, ads: hasAdsService }
                }
            }

            return {
                type: 'client', // Metadata
                client: client as Client,
                invoices: (invoices || []) as Invoice[],
                quotes: (quotes || []) as Quote[],
                briefings: (briefings || []) as Briefing[],
                events: (events || []) as ClientEvent[],
                settings: settings || {},
                services: filteredServices as Service[],
                activePortalModules: activePortalModules as Array<{
                    slug: string
                    portal_tab_label: string
                    portal_icon_key: string
                }>,
                paymentMethods: activePaymentMethods,
                insightsAccess: {
                    show: showInsights,
                    mode: insightsMode
                }
            }
        }

        // ---------------------------------------------------------
        // 3. If NO Client, try finding a STAFF member
        // ---------------------------------------------------------
        if (!client && isUuid) {
            // Staff access is strictly by UUID access_token
            const { data: staff, error: staffError } = await supabaseAdmin
                .from('cleaning_staff_profiles')
                .select('*')
                .eq('access_token', token)
                .is('deleted_at', null)
                .maybeSingle()

            if (staff) {
                // Fetch basic settings for branding (same as client)
                const { data: settings } = await supabaseAdmin
                    .from('organization_settings')
                    .select('*')
                    .eq('organization_id', staff.organization_id)
                    .single()

                // Fetch Staff Jobs (Appointments) for today/upcoming
                // Logic: Unified 'appointments' table
                const startOfDay = new Date()
                startOfDay.setHours(0, 0, 0, 0)

                const { data: rawJobs, error: jobsError } = await supabaseAdmin
                    .from('appointments')
                    .select('*')
                    .eq('staff_id', staff.id)
                    .gte('start_time', startOfDay.toISOString())
                    .order('start_time', { ascending: true })

                if (jobsError) {
                    console.error('Error fetching jobs:', jobsError)
                    return { type: 'staff', staff, settings: settings || {}, jobs: [] }
                }

                // Manual Joins to avoid FK issues (as seen in job-actions.ts)
                const jobs = await Promise.all((rawJobs || []).map(async (job) => {
                    const [clientRes, serviceRes] = await Promise.all([
                        job.client_id
                            ? supabaseAdmin.from('clients').select('id, name, phone, address').eq('id', job.client_id).maybeSingle()
                            : Promise.resolve({ data: null }),
                        job.service_id
                            ? supabaseAdmin.from('cleaning_services').select('id, name, estimated_duration_minutes').eq('id', job.service_id).maybeSingle()
                            : Promise.resolve({ data: null })
                    ])

                    return {
                        id: job.id,
                        title: job.title,
                        description: job.description,
                        start_time: job.start_time,
                        end_time: job.end_time,
                        status: job.status,
                        address_text: job.address_text,
                        location_type: job.location_type,
                        client: clientRes.data,
                        service: serviceRes.data
                    }
                }))

                return {
                    type: 'staff',
                    staff: staff,
                    settings: settings || {},
                    jobs: jobs || []
                }
            }
        }

        console.error('Portal Fetch Error: Token not found in Clients or Staff')
        throw new Error('Invalid token or not found')

    } catch (error) {
        console.error('getPortalData Error:', error)
        throw error
    }
}



export async function getPortalMetadata(token: string) {
    // Lightweight fetch for metadata only - NOW WITH SECURITY!
    try {
        // Step 1: Get client from token to know which organization
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let query = supabaseAdmin.from('clients').select('organization_id')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client } = await query.single()
        if (!client) return {}

        // Step 2: Get settings for THAT organization only
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', client.organization_id)
            .single()

        return settings || {}
    } catch {
        return {}
    }
}

export async function regeneratePortalToken(clientId: string) {
    try {
        // 1. Generate new token using DB function
        const { data: newToken, error: tokenError } = await supabaseAdmin
            .rpc('generate_short_token')

        if (tokenError) throw tokenError

        // 2. Update client
        const { error: updateError } = await supabaseAdmin
            .from('clients')
            .update({
                portal_short_token: newToken,
                portal_token_created_at: new Date().toISOString()
            })
            .eq('id', clientId)

        if (updateError) throw updateError

        return { success: true, token: newToken }
    } catch (error) {
        console.error('regeneratePortalToken Error:', error)
        return { success: false, error: 'Error regenerating token' }
    }
}

export async function acceptQuote(token: string, quoteId: string) {
    try {
        // 1. Verify Client
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Update Quote
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'accepted' })
            .eq('id', quoteId)
            .eq('client_id', client.id) // Ensure ownership
            .select()
            .single()

        if (quoteError) throw quoteError

        // 3. Create Event
        await supabaseAdmin.from('client_events').insert({
            client_id: client.id,
            type: 'quote',
            title: 'Cotización Aprobada',
            description: `Se ha aprobado la cotización #${quote.number}`,
            metadata: {
                quote_id: quote.id,
                amount: quote.total
            },
            icon: 'FileCheck'
        })

        // 4. Create Notification
        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id,
                type: 'quote_accepted',
                title: '✅ Cotización Aprobada',
                message: `El cliente ${client.name} ha aprobado la cotización #${quote.number}. Monto: $${quote.total.toLocaleString()}`,
                client_id: client.id,
                action_url: `/dashboard/quotes/${quote.id}`,
                read: false
            })
        } else {
            console.warn('⚠️ No admin user_id found for client', client.id)
        }

        return { success: true }
    } catch (error) {
        console.error('acceptQuote Error:', error)
        return { success: false, error: 'Error accepting quote' }
    }
}

export async function rejectQuote(token: string, quoteId: string) {
    try {
        // 1. Verify Client
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Update Quote
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'rejected' })
            .eq('id', quoteId)
            .eq('client_id', client.id) // Ensure ownership
            .select()
            .single()

        if (quoteError) throw quoteError

        // 3. Create Event
        await supabaseAdmin.from('client_events').insert({
            client_id: client.id,
            type: 'quote',
            title: 'Cotización Rechazada',
            description: `Se ha rechazado la cotización #${quote.number}`,
            metadata: {
                quote_id: quote.id,
                amount: quote.total
            },
            icon: 'FileX'
        })

        // 4. Create Notification
        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id,
                type: 'quote_rejected',
                title: '❌ Cotización Rechazada',
                message: `El cliente ${client.name} ha rechazado la cotización #${quote.number}.`,
                client_id: client.id,
                action_url: `/dashboard/quotes/${quote.id}`,
                read: false
            })
        }

        return { success: true }
    } catch (error) {
        console.error('rejectQuote Error:', error)
        return { success: false, error: 'Error rejecting quote' }
    }
}

export async function registerServiceInterest(token: string, serviceId: string, serviceName: string) {
    try {
        // 1. Verify Client
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Create Event (Interest)
        // Check if recently requested to avoid spam
        const { data: existing } = await supabaseAdmin
            .from('client_events')
            .select('id')
            .eq('client_id', client.id)
            .eq('type', 'interest')
            .eq('metadata->>service_id', serviceId)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .single()

        if (!existing) {
            await supabaseAdmin.from('client_events').insert({
                client_id: client.id,
                type: 'interest',
                title: 'Interés en Servicio',
                description: `El cliente ha mostrado interés en: ${serviceName}`,
                metadata: {
                    service_id: serviceId,
                    service_name: serviceName,
                    channel: 'whatsapp_click'
                },
                icon: 'Heart'
            })

            // 3. Create Notification
            if (client.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: client.user_id,
                    type: 'service_interest',
                    title: '❤️ Interés en Servicio',
                    message: `El cliente ${client.name} está interesado en: ${serviceName}`,
                    client_id: client.id,
                    action_url: `/dashboard/clients/${client.id}`,
                    read: false
                })

            }


            return { success: true }
        }

        return { success: true }
    } catch (error) {
        console.error('registerServiceInterest Error:', error)
        return { success: false, error: 'Error registering interest' }
    }
}

export async function getPortalBriefing(token: string, briefingId: string) {
    // 1. Verify Client by Token
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Briefing with template structure (NEW: use structure column)
    const { data, error } = await supabaseAdmin
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(
                id,
                name,
                description,
                structure
            ),
            client:clients(name, email)
        `)
        .eq('id', briefingId)
        .eq('client_id', client.id) // Security Check
        .single()

    if (error) {
        console.error("Error fetching portal briefing:", error)
        throw error
    }

    return data as PortalBriefing
}

export async function getPortalBriefingResponses(token: string, briefingId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Responses
    const { data, error } = await supabaseAdmin
        .from('briefing_responses')
        .select('*')
        .eq('briefing_id', briefingId)

    if (error) throw error

    // Return responses directly (values are stored as-is in JSONB)
    return data || []
}

export async function getPortalCatalog(token: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Catalog (Admin bypasses RLS)
    const { data, error } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('is_catalog_item', true)
        .eq('is_visible_in_portal', true)
        .order('category')

    if (error) throw error
    return data
}

export async function getPortalQuote(token: string, quoteId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id, organization_id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Quote
    const { data, error } = await supabaseAdmin
        .from('quotes')
        .select(`
            *,
            client:clients (*),
            lead:leads (*),
            emitter:emitters (*)
        `)
        .eq('id', quoteId)
        .eq('client_id', client.id)
        .single()

    if (error) throw error

    // Smart Fallback
    if (!data.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin
            .from('emitters')
            .select('*')
            .eq('organization_id', client.organization_id)
            .eq('is_default', true)
            .maybeSingle()
        if (defaultEmitter) {
            data.emitter = defaultEmitter
        } else {
            const { data: anyEmitter } = await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_active', true).limit(1).maybeSingle()
            if (anyEmitter) data.emitter = anyEmitter
        }
    }

    return data as Quote
}

export async function getPortalInvoice(token: string, invoiceId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id, organization_id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Invoice
    const { data, error } = await supabaseAdmin
        .from('invoices')
        .select(`
            *,
            client:clients (*),
            emitter:emitters (*)
        `)
        .eq('id', invoiceId)
        .eq('client_id', client.id)
        .is('deleted_at', null)
        .single()

    if (error) throw error

    // Smart Fallback
    if (!data.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin
            .from('emitters')
            .select('*')
            .eq('organization_id', client.organization_id)
            .eq('is_default', true)
            .maybeSingle()
        if (defaultEmitter) {
            data.emitter = defaultEmitter
        } else {
            const { data: anyEmitter } = await supabaseAdmin.from('emitters').select('*').eq('organization_id', client.organization_id).eq('is_active', true).limit(1).maybeSingle()
            if (anyEmitter) data.emitter = anyEmitter
        }
    }

    return data as Invoice
}

// -------------------------------------------------------------
// WORKER PORTAL ACTIONS
// -------------------------------------------------------------

export async function startJob(token: string, jobId: string, location?: { lat: number, lng: number }) {
    try {
        // 1. Verify Staff by Token
        const { data: staff, error: staffError } = await supabaseAdmin
            .from('cleaning_staff_profiles')
            .select('*')
            .eq('access_token', token)
            .is('deleted_at', null)
            .single()

        if (staffError || !staff) throw new Error('Unauthorized')

        // 2. Verify Job Ownership
        const { data: job, error: jobError } = await supabaseAdmin
            .from('appointments')
            .select('id, start_time')
            .eq('id', jobId)
            .eq('staff_id', staff.id)
            .single()

        if (jobError || !job) throw new Error('Job not found or not assigned to you')

        // 3. Update Job
        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: 'in_progress',
                // Optional: Store actual start time? 
                // We might want to add 'actual_start_time' to schema later.
                gps_coordinates: location ? location : undefined
            })
            .eq('id', jobId)

        if (updateError) throw updateError

        return { success: true }
    } catch (error) {
        console.error('startJob Error:', error)
        return { success: false, error: 'Error starting job' }
    }
}

export async function completeJob(token: string, jobId: string) {
    try {
        // 1. Verify Staff by Token
        const { data: staff, error: staffError } = await supabaseAdmin
            .from('cleaning_staff_profiles')
            .select('*')
            .eq('access_token', token)
            .is('deleted_at', null)
            .single()

        if (staffError || !staff) throw new Error('Unauthorized')

        // 2. Verify Job Ownership
        const { data: job, error: jobError } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('id', jobId)
            .eq('staff_id', staff.id)
            .single()

        if (jobError || !job) throw new Error('Job not found or not assigned to you')

        // 3. Update Job
        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: 'completed',
                // Optional: Store actual end time?
            })
            .eq('id', jobId)

        if (updateError) throw updateError

        return { success: true }
    } catch (error) {
        console.error('completeJob Error:', error)
        return { success: false, error: 'Error completing job' }
    }
}
