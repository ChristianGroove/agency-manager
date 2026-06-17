import { NextResponse } from "next/server"
import { resolvePortalInsightsAccess } from "@/modules/features/portal/insights/access"
import { isProductionRuntime } from "@/app/api/_guards/request-guards"
import { createClient } from "@/modules/core/database/supabase-server";

export const dynamic = 'force-dynamic'

const PUBLIC_PORTAL_INSIGHTS_ERROR = "Internal Server Error"

function logPortalInsightsError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function logPortalInsightsWarning(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.warn(label, error instanceof Error ? error.message : error)
        return
    }

    console.warn(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function portalInsightsErrorMessage(error: unknown) {
    if (isProductionRuntime()) {
        return PUBLIC_PORTAL_INSIGHTS_ERROR
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return PUBLIC_PORTAL_INSIGHTS_ERROR
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')?.trim()

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    try {
        // 1. Verify Portal Token & Get Client
        const isUuidToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let clientQuery = (await createClient())
            .from('leads')
            .select('id, organization_id, portal_token_never_expires, portal_token_expires_at, portal_insights_settings, services(name, status, insights_access)')
            .is('deleted_at', null)

        clientQuery = isUuidToken
            ? clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
            : clientQuery.eq('portal_short_token', token)

        const { data: client, error: clientError } = await clientQuery.maybeSingle()

        if (clientError || !client) {
            logPortalInsightsError("[PortalAPI] Invalid token or client not found:", clientError)
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        if (client.portal_token_never_expires !== true &&
            client.portal_token_expires_at &&
            new Date(client.portal_token_expires_at) < new Date()) {
            return NextResponse.json({ error: "Portal token expired" }, { status: 401 })
        }

        const [{ data: orgData }, { data: orgSettings }] = await Promise.all([
            (await createClient())
                .from('organizations')
                .select('active_app_id, saas_apps(portal_template)')
                .eq('id', client.organization_id)
                .maybeSingle(),
            (await createClient())
                .from('organization_settings')
                .select('portal_modules')
                .eq('organization_id', client.organization_id)
                .maybeSingle(),
        ])

        const portalTemplate = (orgData?.saas_apps as any)?.portal_template || 'b2b_dashboard'
        if (portalTemplate !== 'b2b_dashboard' || orgSettings?.portal_modules?.insights === false) {
            return NextResponse.json({ error: "Insights not available" }, { status: 403 })
        }

        const insightsAccess = resolvePortalInsightsAccess(
            (client.services || []) as any[],
            client.portal_insights_settings
        )

        if (!insightsAccess.show) {
            return NextResponse.json({ error: "Insights not available" }, { status: 403 })
        }

        let adsMetrics = null
        if (insightsAccess.mode.ads) {
            const { data: cachedAds, error: adsError } = await (await createClient())
                .from('meta_ads_metrics')
                .select('*')
                .eq('client_id', client.id)
                .order('snapshot_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (adsError) logPortalInsightsWarning("[PortalAPI] Ads Fetch Error (or empty):", adsError)
            adsMetrics = cachedAds
        }

        let socialMetrics = null
        if (insightsAccess.mode.organic) {
            const { data: cachedSocial, error: socialError } = await (await createClient())
                .from('meta_social_metrics')
                .select('*')
                .eq('client_id', client.id)
                .order('snapshot_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (socialError) logPortalInsightsWarning("[PortalAPI] Social Fetch Error (or empty):", socialError)
            socialMetrics = cachedSocial
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
        logPortalInsightsError("[PortalAPI] Critical Error:", e)
        return NextResponse.json({ error: portalInsightsErrorMessage(e) }, { status: 500 })
    }
}

