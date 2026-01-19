
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Should contain org_id
    const error = searchParams.get('error');

    // 1. Handle Errors from Meta
    if (error) {
        const errorDesc = searchParams.get('error_description');
        console.error("Meta OAuth Error:", error, errorDesc);
        return NextResponse.redirect(`${origin}/platform/integrations?error=meta_oauth_failed&desc=${encodeURIComponent(errorDesc || '')}`);
    }

    if (!code || !state) {
        console.error("Meta OAuth Missing Params:", { code: !!code, state: !!state });
        return NextResponse.redirect(`${origin}/platform/integrations?error=missing_params`);
    }

    // 2. Decode State (Expects: "orgId")
    // In production, this should be signed/encrypted to prevent CSRF
    const orgId = state;

    // 3. Exchange Code for Token & Get Assets
    try {
        const { MetaGraphAPI } = await import('@/lib/meta/graph-api');
        const metaApi = new MetaGraphAPI();

        // A. Exchange Code
        const longLivedToken = await metaApi.exchangeCodeForToken(code);

        // B. Get User Info (for metadata)
        const userProfile = await metaApi.getUserProfile(longLivedToken);

        // C. Get Connected Assets (Pages + IG)
        const pages = await metaApi.getConnectedAssets(longLivedToken);

        // D. Get WhatsApp Business Accounts
        const { data: wabas, error: wabaError } = await metaApi.getWhatsAppAccounts(longLivedToken);

        console.log("🚀 Meta Connected!", {
            user: userProfile.name,
            pagesFound: pages.length,
            wabasFound: wabas.length,
            wabaError
        });

        // 4. Update Main Connection in DB
        // USE SERVICE ROLE: Bypasses RLS because the callback might not have the user's session cookies (cross-domain)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // FAILSAFE: Check if connection already exists (even if deleted) to prevent "Duplicate Key"
        // We order by created_at desc to get the latest one, effectively "resurrecting" it if it was deleted.
        const { data: existingConnections } = await supabase
            .from('integration_connections')
            .select('id')
            .eq('organization_id', orgId)
            .eq('provider_key', 'meta_business')
            .order('created_at', { ascending: false })
            .limit(1);

        const existingConnection = existingConnections?.[0];

        // Merge assets for preview
        const whatsappAssets = wabas.flatMap((w: any) => {
            const numbers = w.phone_numbers?.data || [];
            // If WABA has no numbers, we might still want to show the WABA itself as a container? 
            // But we can't send/receive without a number. So skipping empty WABAs is safer.
            // Or if numbers is empty, maybe the user hasn't added one yet.
            if (numbers.length === 0) {
                return {
                    id: w.id,
                    name: `${w.name} (No Phone Numbers)`,
                    type: 'whatsapp_waba', // Distinct type just in case
                    has_ig: false,
                    display_phone_number: 'N/A',
                    waba_id: w.id
                };
            }

            return numbers.map((n: any) => ({
                id: n.id, // Phone Number ID
                name: n.verified_name || n.display_phone_number || w.name,
                type: 'whatsapp',
                has_ig: false,
                display_phone_number: n.display_phone_number,
                waba_id: w.id,
                quality_rating: n.quality_rating
            }));
        });

        const combinedAssets = [
            ...pages.map(a => ({ id: a.id, name: a.name, type: 'page', has_ig: !!a.instagram_business_account })),
            ...whatsappAssets
        ];

        // Upsert payload
        const connectionPayload: any = {
            organization_id: orgId,
            provider_key: 'meta_business', // UNIFIED KEY
            connection_name: `Meta: ${userProfile.name}`,
            status: 'action_required', // Means "Connected but assets not selected"
            credentials: {
                access_token: longLivedToken, // Encrypt in real app
                user_id: userProfile.id,
                user_name: userProfile.name
            },
            metadata: {
                total_assets_available: combinedAssets.length,
                assets_preview: combinedAssets,
                waba_debug_error: wabaError // Saving error for frontend feedback
            },
            is_primary: true,
            updated_at: new Date().toISOString()
        };

        // If it exists, include ID to force UPDATE
        if (existingConnection?.id) {
            connectionPayload.id = existingConnection.id;
        }

        // Upsert the "Mother" connection (Meta Business)
        const { error: dbError } = await supabase.from('integration_connections').upsert(connectionPayload);

        if (dbError) {
            console.error("DB Save Error:", dbError);
            return NextResponse.redirect(`${origin}/platform/integrations?error=db_save_failed&desc=${encodeURIComponent(dbError.message + ' - ' + dbError.details || '')}`);
        }

        // 5. Redirect to Integrations with "Setup" trigger
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
        return NextResponse.redirect(`${appUrl}/platform/integrations?success=meta_connected&action=configure_assets`);

    } catch (err: any) {
        console.error("Meta Exchange Failed:", err);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
        return NextResponse.redirect(`${appUrl}/platform/integrations?error=exchange_failed&desc=${encodeURIComponent(err.message)}`);
    }
}
