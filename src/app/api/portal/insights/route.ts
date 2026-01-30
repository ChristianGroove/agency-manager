import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { MetaConnector } from "@/lib/integrations/meta/connector"
import { AdsService } from "@/lib/integrations/meta/ads-service"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const datePreset = searchParams.get('date_preset') // 'today', 'yesterday', 'this_month'

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    try {
        // 1. Verify Portal Token & Get Client
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, services(name, status)')
            .eq('portal_short_token', token)
            .single()

        if (clientError || !client) {
            console.error("[PortalAPI] Invalid token or client not found:", token, clientError)
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        console.log(`[PortalAPI] Resolved Client: ${client.id} for token: ${token}`)

        let adsMetrics = null
        let isLiveFetch = false

        // 2. LIVE FETCH OPTION
        // If specific date preset is requested (today/yesterday) OR just for debugging/verification, we fetch LIVE
        if (datePreset) {
            try {
                const { data: config } = await supabaseAdmin
                    .from('integration_configs')
                    .select('access_token, ad_account_id')
                    .eq('client_id', client.id)
                    .eq('platform', 'meta')
                    .single()

                if (config?.access_token && config?.ad_account_id) {
                    const connector = new MetaConnector(config.access_token)
                    const service = new AdsService(connector)
                    adsMetrics = await service.getMetrics(config.ad_account_id, datePreset)
                    isLiveFetch = true
                    console.log(`[PortalAPI] Live Fetch Success for ${datePreset}`)
                }
            } catch (liveError) {
                console.error("[PortalAPI] Live Fetch Failed, falling back to cache:", liveError)
            }
        }

        // 3. Fallback to Cache (Default behavior or if Live Fetch failed)
        if (!adsMetrics) {
            const { data: cachedAds, error: adsError } = await supabaseAdmin
                .from('meta_ads_metrics')
                .select('*')
                .eq('client_id', client.id)
                .order('snapshot_date', { ascending: false })
                .limit(1)
                .single()

            if (adsError) console.warn("[PortalAPI] Ads Fetch Error (or empty):", adsError.message)
            adsMetrics = cachedAds
        }

        // 3. Get Social Data (Latest)
        // 3. Get Social Data (Latest)
        const { data: socialMetrics, error: socialError } = await supabaseAdmin
            .from('meta_social_metrics')
            .select('*')
            .eq('client_id', client.id)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single()

        if (socialError && socialError.code !== 'PGRST116') {
            console.error("[PortalAPI] Social Fetch Error", socialError)
        } else if (socialMetrics) {
            // Data found
        }

        return NextResponse.json({
            ads: adsMetrics || null,
            social: socialMetrics ? {
                facebook: socialMetrics.facebook_data,
                instagram: socialMetrics.instagram_data,
                last_updated: socialMetrics.snapshot_date
            } : null
        })
    } catch (e: any) {
        console.error("[PortalAPI] Critical Error:", e)
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

