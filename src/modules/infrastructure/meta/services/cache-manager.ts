
import { createClient } from '@supabase/supabase-js'
import { AdsService } from './ads-service'
import { SocialService } from './social-service'
import { MetaConnector } from './connector'

// Use service role for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export class MetaCacheManager {

    async syncAll(targetClientId?: string) {
        console.log(`[MetaSync] Starting sync. Target: ${targetClientId || 'ALL'}`)

        // 1. Get Active Configs
        let query = supabase
            .from('integration_configs')
            .select('*')
            .eq('is_active', true)
            .eq('platform', 'meta')

        if (targetClientId) {
            query = query.eq('client_id', targetClientId)
        }

        const { data: configs, error } = await query

        if (error) {
            console.error("[MetaSync] DB Error:", error)
            return { success: false, processed: 0, errors: [{ type: 'db', error: error.message }] }
        }

        if (!configs || configs.length === 0) {
            console.warn(`[MetaSync] No active configs found for ${targetClientId || 'ALL'}`)
            return { success: true, processed: 0, errors: [] }
        }

        console.log(`[MetaSync] Found ${configs.length} configs to process.`)

        let processed = 0
        const errors: any[] = []

        for (const config of configs) {
            try {
                console.log(`[MetaSync] Processing client ${config.client_id}`)
                // Initialize Services
                const connector = new MetaConnector(config.access_token)
                const adsService = new AdsService(connector)
                const socialService = new SocialService(connector)

                // 2. Sync Ads (15m check)
                if (config.ad_account_id) {
                    try {
                        console.log(`[MetaSync] Syncing Ads for ${config.client_id}`)
                        await this.syncAds(config.client_id, config.ad_account_id, adsService)
                        console.log(`[MetaSync] Ads synced for ${config.client_id}`)
                    } catch (e: any) {
                        console.error(`[MetaSync] Ads error for ${config.client_id}:`, e)
                        errors.push({ client: config.client_id, type: 'ads', error: e.message })
                    }
                } else {
                    console.log(`[MetaSync] No Ad Account ID for ${config.client_id}`)
                }

                // 3. Sync Social (60m check)
                if (config.page_id) {
                    try {
                        console.log(`[MetaSync] Syncing Social for ${config.client_id}`)
                        await this.syncSocial(config.client_id, config.page_id, socialService)
                        console.log(`[MetaSync] Social synced for ${config.client_id}`)
                    } catch (e: any) {
                        console.error(`[MetaSync] Social error for ${config.client_id}:`, e)
                        errors.push({ client: config.client_id, type: 'social', error: e.message })
                    }
                } else {
                    console.log(`[MetaSync] No Page ID for ${config.client_id}`)
                }

                processed++
            } catch (error: any) {
                console.error(`Failed to sync client ${config.client_id}:`, error)
                errors.push({ client: config.client_id, type: 'general', error: error.message })
            }
        }

        return { success: true, processed, errors }
    }

    private async syncAds(clientId: string, adAccountId: string, service: AdsService) {
        // Check if sync needed (last updated < 15 mins) - omitted for brevity, logic goes here

        const data = await service.getMetrics(adAccountId)

        const { error: adsError } = await supabase.from('meta_ads_metrics').upsert({
            client_id: clientId,
            snapshot_date: new Date().toISOString().split('T')[0],
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            ctr: data.ctr,
            cpc: data.cpc,
            roas: data.roas,
            campaigns: data.campaigns as any,
            last_updated: new Date().toISOString()
        }, { onConflict: 'client_id, snapshot_date' })

        if (adsError) {
            console.error("[MetaSync] Ads Upsert Failed:", adsError)
            throw new Error("DB Error saving ads: " + adsError.message)
        }
    }

    private async syncSocial(clientId: string, pageId: string, service: SocialService) {
        // Check if sync needed (last updated < 60 mins)

        const data = await service.getMetrics(pageId)
        console.log(`[MetaSync] Social Data to Save for ${clientId}:`, data)

        const { error: socialError } = await supabase.from('meta_social_metrics').upsert({
            client_id: clientId,
            snapshot_date: new Date().toISOString().split('T')[0],
            facebook_data: data.facebook as any,
            instagram_data: data.instagram as any,
            last_updated: new Date().toISOString()
        }, { onConflict: 'client_id, snapshot_date' })

        if (socialError) {
            console.error("[MetaSync] Social Upsert Failed:", socialError)
            throw new Error("DB Error saving social: " + socialError.message)
        }
    }
}
