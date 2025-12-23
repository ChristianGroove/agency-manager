import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // ... (previous code)

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

        // 2. Fetch Cached Metrics
        const { data: adsMetrics, error: adsError } = await supabaseAdmin
            .from('meta_ads_metrics')
            .select('*')
            .eq('client_id', client.id)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single()

        if (adsError) console.warn("[PortalAPI] Ads Fetch Error (or empty):", adsError.message)

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
            console.log("[PortalAPI] Social Data found for:", socialMetrics.snapshot_date)
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

