'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"

const META_PROVIDER_KEY = 'meta_ads_monitor'

function getOptionalFormString(formData: FormData, key: string) {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function sanitizeMetaConfigForClient(config: any) {
    if (!config) return null

    const credentials = config.credentials && typeof config.credentials === 'object'
        ? config.credentials
        : {}
    const { access_token: _accessToken, ...safeCredentials } = credentials

    return {
        ...config,
        credentials: safeCredentials,
        has_access_token: Boolean(credentials.access_token),
    }
}

export async function getOrgMetaConfig() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { config: null, error: "Unauthorized" }

    // Get active organization
    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { config: null, error: "No organization found" }

    const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', member.organization_id)
        .eq('provider_key', META_PROVIDER_KEY)
        .single()

    return { config: sanitizeMetaConfigForClient(data), error }
}

export async function saveOrgMetaConfig(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Get active organization and check permissions (owner/admin)
    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
        return { success: false, error: "Insufficient permissions" }
    }

    const submittedAccessToken = getOptionalFormString(formData, 'access_token')
    const adAccountId = getOptionalFormString(formData, 'ad_account_id')
    const pageId = getOptionalFormString(formData, 'page_id')

    if (!adAccountId || !pageId) {
        return { success: false, error: "Faltan Ad Account ID o Page ID" }
    }

    const { data: existing } = await supabase
        .from('integration_connections')
        .select('id, credentials')
        .eq('organization_id', member.organization_id)
        .eq('provider_key', META_PROVIDER_KEY)
        .single()

    const existingCredentials = existing?.credentials && typeof existing.credentials === 'object'
        ? existing.credentials
        : {}
    const accessToken = submittedAccessToken || existingCredentials.access_token

    if (!accessToken) {
        return { success: false, error: "Falta el token de acceso de Meta" }
    }

    const connectionData = {
        organization_id: member.organization_id,
        provider_key: META_PROVIDER_KEY,
        connection_name: 'Meta Ads Monitor (Org)',
        credentials: {
            access_token: accessToken,
            ad_account_id: adAccountId,
            page_id: pageId
        },
        status: 'active',
        updated_at: new Date().toISOString()
    }

    const { error } = existing 
        ? await supabase.from('integration_connections').update(connectionData).eq('id', existing.id)
        : await supabase.from('integration_connections').insert(connectionData)

    if (error) {
        console.error("Error saving org meta config:", error)
        return { success: false, error: "Error al guardar la configuración" }
    }

    revalidatePath('/dashboard')
    revalidatePath('/settings')
    return { success: true }
}

export async function getOrgAdsMetrics(datePreset: string = 'last_30d') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { data: null, error: "No organization found" }

    // We fetch the latest snapshot for the given date (or range if we want to aggregate)
    // For the MVP, we just take the latest snapshot.
    const { data, error } = await supabase
        .from('meta_org_ads_metrics')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching org ads metrics:", error)
        return { data: null, error: error.message }
    }

    return { data, error: null }
}

export async function syncOrgAdsMetrics(datePreset: string = 'last_30d') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { success: false, error: "No organization found" }

    // 1. Get credentials
    const { data: config } = await supabase
        .from('integration_connections')
        .select('credentials')
        .eq('organization_id', member.organization_id)
        .eq('provider_key', META_PROVIDER_KEY)
        .single()

    const creds = config?.credentials as any
    const accessToken = creds?.access_token
    const adAccountId = creds?.ad_account_id

    if (!accessToken || !adAccountId) {
        return { success: false, error: "Conexión a Meta no configurada. Por favor, configura el Access Token y el Ad Account ID." }
    }

    // 2. Fetch from Meta API
    try {
        const url = `https://graph.facebook.com/v20.0/${adAccountId}/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type,action_values&level=campaign&date_preset=${datePreset}&access_token=${accessToken}`
        
        const response = await fetch(url, { cache: 'no-store' })
        const json = await response.json()

        if (json.error) {
            console.error("Meta API Error:", json.error)
            return { success: false, error: json.error.message || "Error al sincronizar con Meta" }
        }

        const data = json.data || []
        
        // 3. Process and normalize data
        let totalSpend = 0
        let totalImpressions = 0
        let totalClicks = 0
        let totalConversions = 0
        let totalActionValue = 0

        const campaigns = data.map((item: any) => {
            const spend = Number(item.spend || 0)
            const impressions = Number(item.impressions || 0)
            const clicks = Number(item.clicks || 0)
            
            const actions = item.actions || []
            const leadAction = actions.find((a: any) => a.action_type === 'lead' || a.action_type.includes('lead'))
            const conversions = leadAction ? Number(leadAction.value) : 0
            
            const actionValues = item.action_values || []
            const leadValue = actionValues.find((a: any) => a.action_type === 'lead' || a.action_type.includes('lead'))
            const conversionValue = leadValue ? Number(leadValue.value) : 0

            totalSpend += spend
            totalImpressions += impressions
            totalClicks += clicks
            totalConversions += conversions
            totalActionValue += conversionValue

            return {
                id: item.campaign_id,
                name: item.campaign_name,
                status: 'ACTIVE', // Defaulting to active as it had insights
                spend,
                impressions,
                clicks,
                ctr: Number(item.ctr || 0),
                cpc: Number(item.cpc || 0),
                conversions,
                cost_per_conversion: conversions > 0 ? spend / conversions : 0,
                roas: spend > 0 ? conversionValue / spend : 0
            }
        })

        const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
        const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        const roas = totalSpend > 0 ? totalActionValue / totalSpend : 0

        const snapshot = {
            organization_id: member.organization_id,
            snapshot_date: new Date().toISOString().split('T')[0],
            spend: totalSpend,
            impressions: totalImpressions,
            clicks: totalClicks,
            cpc: totalCpc,
            ctr: totalCtr,
            conversions: totalConversions,
            cost_per_conversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
            roas,
            campaigns,
            updated_at: new Date().toISOString()
        }

        // 4. Save to DB
        const { data: existingSnapshot } = await supabase
            .from('meta_org_ads_metrics')
            .select('id')
            .eq('organization_id', member.organization_id)
            .eq('snapshot_date', snapshot.snapshot_date)
            .single()

        if (existingSnapshot) {
            await supabase.from('meta_org_ads_metrics').update(snapshot).eq('id', existingSnapshot.id)
        } else {
            await supabase.from('meta_org_ads_metrics').insert(snapshot)
        }

        revalidatePath('/crm/meta-ads')
        return { success: true }
    } catch (error: any) {
        console.error("Error in syncOrgAdsMetrics:", error)
        return { success: false, error: "Fallo inesperado al conectar con Meta" }
    }
}
