
import { createClient } from '@supabase/supabase-js'
import { AdsService } from './ads-service'
import { SocialService } from './social-service'
import { MetaConnector } from './connector'

let supabase: any = null

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function summarizeMetaSyncError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        const payload = error as Record<string, any>
        return {
            type: typeof error,
            code: payload.code,
            status: payload.status,
            metaType: payload.type,
        }
    }

    return { type: typeof error }
}

function detailMetaSyncError(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object') {
        const message = (error as Record<string, any>).message
        if (typeof message === 'string' && message.length > 0) {
            return message
        }
    }

    return fallback
}

function publicMetaSyncError(error: unknown, fallback: string) {
    if (isDeployedRuntime()) {
        return fallback
    }

    return detailMetaSyncError(error, fallback)
}

function logMetaSyncError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeMetaSyncError(error))
}

function logMetaSyncPayload(label: string, data: unknown) {
    if (!isDeployedRuntime()) {
        console.log(label, data)
        return
    }

    const payload = data && typeof data === 'object' ? data as Record<string, any> : {}
    console.log(label, {
        hasFacebook: !!payload.facebook,
        hasInstagram: !!payload.instagram,
        facebookPosts: Array.isArray(payload.facebook?.top_posts) ? payload.facebook.top_posts.length : undefined,
        instagramPosts: Array.isArray(payload.instagram?.top_posts) ? payload.instagram.top_posts.length : undefined,
    })
}

function getSupabaseAdminClient() {
    if (supabase) return supabase

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase service role configuration for Meta sync')
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)
    return supabase
}

export class MetaCacheManager {

    async syncAll(targetClientId?: string) {
        const supabase = getSupabaseAdminClient()

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
            logMetaSyncError("[MetaSync] DB Error:", error)
            return {
                success: false,
                processed: 0,
                errors: [{ type: 'db', error: publicMetaSyncError(error, 'Database sync failed') }]
            }
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
                        logMetaSyncError(`[MetaSync] Ads error for ${config.client_id}:`, e)
                        errors.push({
                            client: config.client_id,
                            type: 'ads',
                            error: publicMetaSyncError(e, 'Ads sync failed')
                        })
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
                        logMetaSyncError(`[MetaSync] Social error for ${config.client_id}:`, e)
                        errors.push({
                            client: config.client_id,
                            type: 'social',
                            error: publicMetaSyncError(e, 'Social sync failed')
                        })
                    }
                } else {
                    console.log(`[MetaSync] No Page ID for ${config.client_id}`)
                }

                processed++
            } catch (error: any) {
                logMetaSyncError(`Failed to sync client ${config.client_id}:`, error)
                errors.push({
                    client: config.client_id,
                    type: 'general',
                    error: publicMetaSyncError(error, 'Meta sync failed')
                })
            }
        }

        return { success: true, processed, errors }
    }

    private async syncAds(clientId: string, adAccountId: string, service: AdsService) {
        const supabase = getSupabaseAdminClient()
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
            logMetaSyncError("[MetaSync] Ads Upsert Failed:", adsError)
            throw new Error(publicMetaSyncError(adsError, "DB Error saving ads"))
        }
    }

    private async syncSocial(clientId: string, pageId: string, service: SocialService) {
        const supabase = getSupabaseAdminClient()
        // Check if sync needed (last updated < 60 mins)

        const data = await service.getMetrics(pageId)
        logMetaSyncPayload(`[MetaSync] Social Data to Save for ${clientId}:`, data)

        const { error: socialError } = await supabase.from('meta_social_metrics').upsert({
            client_id: clientId,
            snapshot_date: new Date().toISOString().split('T')[0],
            facebook_data: data.facebook as any,
            instagram_data: data.instagram as any,
            last_updated: new Date().toISOString()
        }, { onConflict: 'client_id, snapshot_date' })

        if (socialError) {
            logMetaSyncError("[MetaSync] Social Upsert Failed:", socialError)
            throw new Error(publicMetaSyncError(socialError, "DB Error saving social"))
        }
    }
}
