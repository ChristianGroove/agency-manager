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
                .select('id,metadata,status').eq('organization_id', orgId).eq('provider_key', 'whatsapp_cloud')
                .eq('metadata->>asset_id', phone.id).neq('status', 'deleted').maybeSingle()
            if (lookupError) throw new Error('Could not resolve existing channel')
            if (coexistence && existing?.status === 'temporarily_offboarded') {
                throw new Error('Este número está reconectándose. Espera la confirmación de Meta antes de iniciar otra alta.')
            }
            if (coexistence && existing?.metadata?.onboarding_status === 'offboard_required'
                && existing?.metadata?.coexistence_state !== 'partner_removed') {
                throw new Error('Desconecta primero la plataforma empresarial desde WhatsApp Business y completa una nueva alta.')
            }
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
            // Routing must be available before asking Meta to deliver history webhooks.
            // Coexistence remains in sync_pending until both one-time requests are accepted.
            const ready = await client.from('integration_connections').update({ status: 'active', metadata: {
                ...metadata, webhook_status: 'active', onboarding_status: coexistence ? 'sync_pending' : 'ready',
            }}).eq('id', connectionId!).eq('organization_id', orgId).eq('status', 'connecting').select('id').single()
            if (ready.error || !ready.data) throw new Error('Could not activate channel')
            let syncStatus = 'not_applicable'
            if (coexistence) {
                syncStatus = 'pending'
                try {
                    const attempt = await client.rpc('begin_meta_coexistence_onboarding', {
                        p_connection_id: connectionId!, p_organization_id: orgId,
                    })
                    if (attempt.error) throw new Error('Could not begin coexistence synchronization')
                    const contactsClaim = await client.rpc('claim_meta_coexistence_sync', {
                        p_connection_id: connectionId!, p_organization_id: orgId, p_kind: 'contacts',
                    })
                    if (contactsClaim.error) throw new Error('Could not reserve contacts synchronization')
                    const previousRequestIdsValid = existing?.metadata?.coexistence_state !== 'partner_removed'
                    let contactsRequested = previousRequestIdsValid && !!existing?.metadata?.contacts_sync_request_id
                    if (contactsClaim.data === true) {
                        const contacts = await this.graph(phone.id + '/smb_app_data', accessToken, { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' })
                        if (!contacts.request_id) throw new Error('Meta did not identify the contacts request')
                        const recorded = await client.rpc('set_meta_connection_metadata', { p_connection_id: connectionId!, p_organization_id: orgId,
                            p_patch: { contacts_sync_request_id: contacts.request_id } })
                        if (recorded.error) throw new Error('Could not record contacts request')
                        contactsRequested = true
                    }
                    const historyClaim = await client.rpc('claim_meta_coexistence_sync', {
                        p_connection_id: connectionId!, p_organization_id: orgId, p_kind: 'history',
                    })
                    if (historyClaim.error) throw new Error('Could not reserve history synchronization')
                    let historyRequested = previousRequestIdsValid && !!existing?.metadata?.history_sync_request_id
                    if (historyClaim.data === true) {
                        const history = await this.graph(phone.id + '/smb_app_data', accessToken, { messaging_product: 'whatsapp', sync_type: 'history' })
                        if (!history.request_id) throw new Error('Meta did not identify the history request')
                        const recorded = await client.rpc('set_meta_connection_metadata', { p_connection_id: connectionId!, p_organization_id: orgId,
                            p_patch: { history_sync_request_id: history.request_id } })
                        if (recorded.error) throw new Error('Could not record history request')
                        historyRequested = true
                    }
                    syncStatus = contactsRequested && historyRequested ? 'requested' : 'pending'
                } catch {
                    syncStatus = 'action_required'
                }
                // Do not overwrite progress already delivered by Meta with stale metadata.
                const update = await client.rpc('set_meta_connection_metadata', { p_connection_id: connectionId!, p_organization_id: orgId,
                    p_patch: { history_sync_request_status: syncStatus,
                        onboarding_status: syncStatus === 'requested' ? 'sync_requested'
                            : syncStatus === 'action_required' ? 'offboard_required' : 'sync_pending' } })
                if (update.error) throw new Error('Could not save synchronization status')
                if (syncStatus === 'action_required') {
                    const blocked = await client.from('integration_connections').update({ status: 'action_required' })
                        .eq('id', connectionId!).eq('organization_id', orgId)
                    if (blocked.error) throw new Error('Could not pause channel after sync failure')
                }
            }
            return { success: true, connectionId, wabaId, syncStatus }
        } catch (error) {
            if (connectionId) {
                await client.from('integration_connections').update({ status: 'error' }).eq('id', connectionId)
                    .eq('organization_id', orgId).in('status', ['connecting', 'active'])
            }
            console.error('[EmbeddedSignup] Failed', { error: error instanceof Error ? error.name : 'Unknown' })
            return { success: false, connectionId, error: error instanceof Error ? error.message : 'Embedded signup failed' }
        }
    }
}
export const embeddedSignupHandler = new EmbeddedSignupHandler()
