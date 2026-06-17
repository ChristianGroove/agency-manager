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
