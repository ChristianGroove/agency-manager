import { resolveConnectionCredentials } from '@/modules/infrastructure/integrations/connection-secrets'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

/** Read-only Graph probe; secrets are sent only in the Authorization header. */
export async function probeMarketingChannel(organizationId: string, connectionId: string) {
    const row = await supabaseAdmin.from('integration_connections').select('id,credentials,metadata,status,provider_key')
        .eq('organization_id', organizationId).eq('id', connectionId).single()
    if (row.error || !row.data || !['whatsapp_cloud', 'meta_whatsapp'].includes(row.data.provider_key)) {
        throw new Error('No se pudo consultar el canal autorizado.')
    }
    let quality = 'UNKNOWN'
    try {
        if (row.data.status !== 'active') throw new Error('Channel unavailable')
        if (row.data.credentials?._private && row.data.credentials._private !== connectionId) throw new Error('Credential ownership mismatch')
        const phoneId = row.data.metadata?.phone_number_id || row.data.metadata?.asset_id
        if (typeof phoneId !== 'string' || !/^\d+$/.test(phoneId)) throw new Error('Phone unavailable')
        const credentials = await resolveConnectionCredentials(row.data.credentials)
        const token = credentials.accessToken || credentials.access_token
        if (typeof token !== 'string' || !token) throw new Error('Token unavailable')
        const response = await fetch(`https://graph.facebook.com/v24.0/${phoneId}?fields=quality_rating`, {
            headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000), cache: 'no-store',
        })
        if (!response.ok) throw new Error('Graph probe failed')
        const data = await response.json()
        if (['GREEN', 'YELLOW', 'RED'].includes(data.quality_rating)) quality = data.quality_rating
    } catch {
        // Never retain a stale positive probe after a failed refresh, and never expose Graph text.
    }
    const saved = await supabaseAdmin.rpc('store_marketing_channel_probe', {
        p_org: organizationId, p_connection: connectionId, p_quality: quality,
    })
    if (saved.error) throw new Error('No se pudo guardar la comprobación del canal.')
    return quality
}

export async function refreshStaleMarketingChannels() {
    const claims = await supabaseAdmin.rpc('claim_marketing_health_probes', { p_limit: 3 })
    if (claims.error) throw new Error('No se pudieron adquirir las comprobaciones del canal.')
    await Promise.all((claims.data || []).map((row: { organization_id: string; connection_id: string }) =>
        probeMarketingChannel(row.organization_id, row.connection_id)))
}
