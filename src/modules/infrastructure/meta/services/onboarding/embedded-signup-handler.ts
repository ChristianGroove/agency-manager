import { randomInt } from 'crypto'
import { createClient } from '@/modules/core/database/supabase-server'
import { encryptObject } from '@/modules/infrastructure/integrations/encryption'

const GRAPH = 'https://graph.facebook.com/v24.0'
export type SignupMode = 'cloud' | 'coexistence'
export interface OnboardingResult { success: boolean; connectionId?: string; wabaId?: string; error?: string; syncStatus?: string }

export class EmbeddedSignupHandler {
    private async graph(endpoint: string, token: string, body?: Record<string, unknown>) {
        const response = await fetch(GRAPH + '/' + endpoint, {
            method: body ? 'POST' : 'GET',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(20000),
        })
        const data = await response.json()
        if (!response.ok || data.error) throw new Error('Meta request failed (' + (data.error?.code || response.status) + ')')
        return data
    }

    async completeOnboarding(orgId: string, code: string, wabaId?: string, phoneNumberId?: string, mode: SignupMode = 'cloud'): Promise<OnboardingResult> {
        let connectionId: string | undefined
        const client = await createClient()
        try {
            if (!wabaId || !/^\d+$/.test(wabaId)) throw new Error('Missing selected WhatsApp Business Account')
            const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID
            const appSecret = process.env.META_APP_SECRET
            if (!appId || !appSecret) throw new Error('Meta configuration unavailable')
            const exchange = new URL(GRAPH + '/oauth/access_token')
            exchange.searchParams.set('client_id', appId)
            exchange.searchParams.set('client_secret', appSecret)
            exchange.searchParams.set('code', code)
            const response = await fetch(exchange, { signal: AbortSignal.timeout(20000) })
            const token = await response.json()
            if (!response.ok || !token.access_token) throw new Error('Meta authorization could not be exchanged')
            const accessToken = token.access_token as string
            // The asset must actually be readable with the customer's newly granted token.
            const numbers: any[] = []
            let endpoint = wabaId + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=100'
            for (let page = 0; page < 20; page++) {
                const result = await this.graph(endpoint, accessToken)
                numbers.push(...(result.data || []))
                if (!result.paging?.next) break
                if (page === 19) throw new Error('Too many phone numbers; select a dedicated account')
                endpoint = wabaId + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=100&after=' + encodeURIComponent(result.paging.cursors.after)
            }
            const phone = phoneNumberId ? numbers.find(n => n.id === phoneNumberId) : numbers.length === 1 ? numbers[0] : null
            if (!phone) throw new Error('Select exactly one authorized phone number')
            const capabilities = await this.graph(phone.id + '?fields=is_on_biz_app,platform_type', accessToken)
            const coexistence = capabilities.is_on_biz_app === true
            if (coexistence && capabilities.platform_type !== 'CLOUD_API') throw new Error('Coexistence Cloud API is not ready')
            if ((mode === 'coexistence') !== coexistence) throw new Error('Phone mode does not match the completed Meta flow')
            const { data: existing, error: lookupError } = await client.from('integration_connections')
                .select('id,metadata').eq('organization_id', orgId).eq('provider_key', 'whatsapp_cloud')
                .eq('metadata->>asset_id', phone.id).neq('status', 'deleted').maybeSingle()
            if (lookupError) throw new Error('Could not resolve existing channel')
            const pin = randomInt(100000, 1000000).toString()
            const metadata = {
                ...(existing?.metadata || {}), asset_id: phone.id, asset_type: 'whatsapp',
                asset_name: phone.verified_name, waba_id: wabaId, display_phone_number: phone.display_phone_number,
                source: 'embedded_signup', connection_mode: mode, webhook_status: 'pending',
                onboarding_status: 'subscribing', is_on_biz_app: coexistence,
                platform_type: capabilities.platform_type,
                history_sync_status: coexistence ? existing?.metadata?.history_sync_status || 'pending' : 'not_applicable',
                onboarded_at: existing?.metadata?.onboarded_at || new Date().toISOString(),
            }
            const payload = { organization_id: orgId, provider_key: 'whatsapp_cloud',
                connection_name: phone.verified_name || phone.display_phone_number,
                credentials: encryptObject({ access_token: accessToken, registration_pin: pin,
                    ...(token.expires_in ? { expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString() } : {}) }),
                metadata, config: { asset_type: 'whatsapp' }, status: 'connecting' }
            const query = existing ? client.from('integration_connections').update(payload).eq('id', existing.id).eq('organization_id', orgId)
                : client.from('integration_connections').insert(payload)
            const saved = await query.select('id').single()
            if (saved.error || !saved.data) throw new Error('Could not save channel; this asset may already belong to another organization')
            connectionId = saved.data.id
            await this.graph(wabaId + '/subscribed_apps', accessToken, {})
            // Coexistence numbers must NEVER be registered again through /register.
            if (!coexistence && capabilities.platform_type !== 'CLOUD_API') {
                await this.graph(phone.id + '/register', accessToken, { messaging_product: 'whatsapp', pin })
            }
            // Mark routing available before asking Meta to deliver the history webhooks.
            const ready = await client.from('integration_connections').update({ status: 'active', metadata: {
                ...metadata, webhook_status: 'active', onboarding_status: 'ready',
            }}).eq('id', connectionId!).eq('organization_id', orgId)
            if (ready.error) throw new Error('Could not activate channel')
            let syncStatus = 'not_applicable'
            if (coexistence) {
                syncStatus = 'requested'
                try {
                    const claim = await client.rpc('claim_meta_history_request', { p_connection_id: connectionId!, p_organization_id: orgId })
                    if (claim.error) throw new Error('Could not reserve synchronization request')
                    if (claim.data === true) {
                        const contacts = await this.graph(phone.id + '/smb_app_data', accessToken, { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' })
                        const history = await this.graph(phone.id + '/smb_app_data', accessToken, { messaging_product: 'whatsapp', sync_type: 'history' })
                        const recorded = await client.rpc('set_meta_connection_metadata', { p_connection_id: connectionId!, p_organization_id: orgId,
                            p_patch: { contacts_sync_request_id: contacts.request_id || null, history_sync_request_id: history.request_id || null } })
                        if (recorded.error) throw new Error('Could not record synchronization requests')
                    } else {
                        syncStatus = existing?.metadata?.history_sync_request_status || 'already_requested'
                    }
                } catch {
                    syncStatus = 'action_required'
                }
                // Do not overwrite progress already delivered by Meta with stale metadata.
                const update = await client.rpc('set_meta_connection_metadata', { p_connection_id: connectionId!, p_organization_id: orgId,
                    p_patch: { history_sync_request_status: syncStatus } })
                if (update.error) throw new Error('Could not save synchronization status')
            }
            return { success: true, connectionId, wabaId, syncStatus }
        } catch (error) {
            if (connectionId) {
                await client.from('integration_connections').update({ status: 'error' }).eq('id', connectionId).eq('organization_id', orgId)
            }
            console.error('[EmbeddedSignup] Failed', { error: error instanceof Error ? error.name : 'Unknown' })
            return { success: false, connectionId, error: error instanceof Error ? error.message : 'Embedded signup failed' }
        }
    }
}
export const embeddedSignupHandler = new EmbeddedSignupHandler()
