import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Create a client-side redirect response that goes through the meta-callback page.
 * 
 * This is CRITICAL for OAuth flows because:
 * - Cross-origin redirects (from facebook.com) don't send SameSite=Lax cookies
 * - We need a client-side page to verify/refresh the session before final redirect
 * 
 * Flow: Facebook → API Callback → /auth/meta-callback → Target Page
 */
function createClientRedirect(
    appUrl: string,
    targetPath: string,
    params: Record<string, string> = {}
) {
    const callbackParams = new URLSearchParams({
        target: targetPath,
        ...params
    });

    const redirectUrl = `${appUrl}/auth/meta-callback?${callbackParams.toString()}`;

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Procesando...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; align-items: center; justify-content: center;
            height: 100vh; margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
        }
        .container { text-align: center; padding: 2rem; }
        .spinner {
            width: 40px; height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%; border-top-color: #fff;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h2 { margin: 0 0 0.5rem; font-weight: 500; }
        p { margin: 0; opacity: 0.7; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Procesando conexión</h2>
        <p>Un momento...</p>
    </div>
    <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`;

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    // 1. Handle Errors from Meta
    if (error) {
        const errorDesc = searchParams.get('error_description');
        console.error("Meta OAuth Error:", error, errorDesc);
        return createClientRedirect(appUrl, '/platform/integrations', {
            error: 'meta_oauth_failed',
            desc: errorDesc || ''
        });
    }

    if (!code || !state) {
        console.error("Meta OAuth Missing Params:", { code: !!code, state: !!state });
        return createClientRedirect(appUrl, '/platform/integrations', {
            error: 'missing_params'
        });
    }

    // 2. Parse State - Format: "orgId" or "orgId:channelType" or "contact_connect:clientId"
    const stateParts = state.split(':');

    // NEW: Contact Connectivity Flow
    if (stateParts[0] === 'contact_connect') {
        const clientId = stateParts[1];
        if (!clientId) return createClientRedirect(appUrl, '/platform/integrations', { error: 'missing_client_id' });

        try {
            const { MetaGraphAPI } = await import('@/lib/meta/graph-api');
            const { saveMetaConfig } = await import('@/modules/core/admin/actions');
            const metaApi = new MetaGraphAPI(appUrl);

            // Exchange for Long Lived Token
            const longLivedToken = await metaApi.exchangeCodeForToken(code);

            // Save Token (Partial Config)
            const formData = new FormData();
            formData.append('access_token', longLivedToken);
            // We don't have ad_account/page yet, those will be selected in UI

            // We use a specific function/logic to just save the token without validation
            // Reuse saveMetaConfig but we need to bypass validation if we just have token
            // For now, let's just update the token using Supabase Admin directly to avoid validation errors in action
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Update or Insert just the token
            const { data: existing } = await supabaseAdmin
                .from("integration_configs")
                .select("id, settings")
                .eq("client_id", clientId)
                .eq("platform", "meta")
                .single();

            const payload = {
                client_id: clientId,
                platform: "meta",
                access_token: longLivedToken,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                await supabaseAdmin.from("integration_configs").update(payload).eq("id", existing.id);
            } else {
                await supabaseAdmin.from("integration_configs").insert(payload);
            }

            // Close Popup Script
            const html = `<!DOCTYPE html><html><body>
            <script>
                window.opener.postMessage({ type: 'META_CONNECT_SUCCESS', clientId: '${clientId}' }, '*');
                window.close();
            </script>
            </body></html>`;
            return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });

        } catch (e: any) {
            console.error("Contact Connect Error:", e);
            return createClientRedirect(appUrl, '/platform/integrations', { error: 'contact_connect_failed', desc: e.message });
        }
    }

    const orgId = stateParts[0];
    const channelType = stateParts[1] as 'whatsapp' | 'messenger' | 'instagram' | undefined;
    const isGranularConnection = !!channelType;

    // 3. Exchange Code for Token & Get Assets
    try {
        const { MetaGraphAPI } = await import('@/lib/meta/graph-api');
        const metaApi = new MetaGraphAPI(appUrl);

        const longLivedToken = await metaApi.exchangeCodeForToken(code);
        const userProfile = await metaApi.getUserProfile(longLivedToken);

        let pages: any[] = [];
        let wabas: any[] = [];
        let wabaError: any = null;

        if (!channelType || channelType === 'messenger' || channelType === 'instagram') {
            pages = await metaApi.getConnectedAssets(longLivedToken);
        }

        if (!channelType || channelType === 'whatsapp') {
            const wabaResult = await metaApi.getWhatsAppAccounts(longLivedToken);
            wabas = wabaResult.data || [];
            wabaError = wabaResult.error;

            // 3.1 Bulk Portfolio Sync (Meta 2026 Compliance)
            // Automatically subscribe ALL WABAs to webhooks to prevent "Shadow Delivery"
            if (wabas.length > 0) {
                console.log(`[MetaCallback] Starting Bulk Sync for ${wabas.length} WABAs...`);

                try {
                    const { wabaSubscriptionManager } = await import('@/lib/meta/waba-subscription-manager');

                    const subscriptionPayload = wabas.map((w: any) => ({
                        wabaId: w.id,
                        accessToken: longLivedToken
                    }));

                    const results = await wabaSubscriptionManager.batchSubscribe(subscriptionPayload);

                    const successCount = results.filter(r => r.success).length;
                    console.log(`[MetaCallback] Bulk Sync Complete. Success: ${successCount}/${wabas.length}`);

                    // Log failures if any
                    results.filter(r => !r.success).forEach(r => {
                        console.error(`[MetaCallback] Failed to subscribe WABA ${r.wabaId}:`, r.error);
                    });

                } catch (syncError) {
                    console.error('[MetaCallback] Bulk Sync Failed:', syncError);
                    // We don't block the flow, but we log the critical error
                }
            }
        }

        console.log("🚀 Meta Connected!", {
            user: userProfile.name,
            channelType: channelType || 'all',
            pagesFound: pages.length,
            wabasFound: wabas.length
        });

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Build WhatsApp assets
        const whatsappAssets = wabas.flatMap((w: any) => {
            const numbers = w.phone_numbers?.data || [];
            if (numbers.length === 0) {
                return {
                    id: w.id,
                    name: `${w.name} (No Phone Numbers)`,
                    type: 'whatsapp_waba',
                    has_ig: false,
                    display_phone_number: 'N/A',
                    waba_id: w.id
                };
            }
            return numbers.map((n: any) => ({
                id: n.id,
                name: n.verified_name || n.display_phone_number || w.name,
                type: 'whatsapp',
                has_ig: false,
                display_phone_number: n.display_phone_number,
                waba_id: w.id,
                quality_rating: n.quality_rating
            }));
        });

        // 4. Map assets based on requested channelType
        let filteredAssets: any[] = [];
        switch (channelType) {
            case 'whatsapp':
                filteredAssets = whatsappAssets.filter(a => a.type === 'whatsapp');
                break;
            case 'messenger':
                filteredAssets = pages.map(p => ({ id: p.id, name: p.name, type: 'page', access_token: p.access_token }));
                break;
            case 'instagram':
                const igAssets = [];
                for (const p of pages) {
                    if (p.instagram_business_account) {
                        const igUsername = await metaApi.getInstagramUsername(p.instagram_business_account.id, p.access_token);
                        igAssets.push({
                            id: p.instagram_business_account.id,
                            name: igUsername || p.name,
                            type: 'instagram',
                            page_id: p.id,
                            access_token: p.access_token
                        });
                    }
                }
                filteredAssets = igAssets;
                break;
            default:
                const allAssets: any[] = [];
                for (const p of pages) {
                    if (p.instagram_business_account) {
                        const igUsername = await metaApi.getInstagramUsername(p.instagram_business_account.id, p.access_token);
                        allAssets.push({
                            id: p.instagram_business_account.id,
                            name: igUsername || p.name,
                            type: 'instagram',
                            page_id: p.id,
                            access_token: p.access_token
                        });
                    }
                    allAssets.push({
                        id: p.id,
                        name: p.name,
                        type: 'page',
                        has_ig: !!p.instagram_business_account,
                        access_token: p.access_token
                    });
                }
                filteredAssets = [
                    ...allAssets,
                    ...whatsappAssets
                ];
        }

        // 5. Handle based on source (Granular vs Full)
        if (isGranularConnection && filteredAssets.length > 0) {
            const { activateMetaChannel } = await import('@/modules/core/integrations/marketplace/meta-channel-actions');

            let successCount = 0;
            let errorMessages: string[] = [];

            for (const asset of filteredAssets) {
                try {
                    let providerKey: 'facebook_page' | 'instagram_dm' | 'instagram_dme' | 'whatsapp_cloud';
                    switch (asset.type) {
                        case 'whatsapp': providerKey = 'whatsapp_cloud'; break;
                        case 'instagram': providerKey = 'instagram_dme'; break;
                        default: providerKey = 'facebook_page';
                    }

                    const result = await activateMetaChannel({
                        orgId,
                        providerKey,
                        assetId: asset.id,
                        assetName: asset.name,
                        accessToken: longLivedToken,
                        pageAccessToken: asset.access_token,
                        displayPhoneNumber: asset.display_phone_number,
                        wabaId: asset.waba_id
                    });

                    if (result.success) successCount++;
                    else errorMessages.push(result.error || 'Unknown error');
                } catch (err: any) {
                    errorMessages.push(err.message);
                }
            }

            const channelWord = channelType === 'whatsapp' ? 'WhatsApp' :
                channelType === 'messenger' ? 'Messenger' : 'Instagram';

            if (successCount > 0) {
                return createClientRedirect(appUrl, '/crm/settings/channels', {
                    success: `${channelWord}_connected`,
                    count: String(successCount)
                });
            } else {
                return createClientRedirect(appUrl, '/crm/settings/channels', {
                    error: 'no_channels_created',
                    desc: errorMessages.join(', ')
                });
            }
        }

        // ===== FULL CONNECTION (from Integraciones) =====
        const { data: existingConnections } = await supabase
            .from('integration_connections')
            .select('id')
            .eq('organization_id', orgId)
            .eq('provider_key', 'meta_business')
            .eq('is_primary', true)
            .order('created_at', { ascending: false })
            .limit(1);

        const existingConnection = existingConnections?.[0];

        const connectionPayload: any = {
            organization_id: orgId,
            provider_key: 'meta_business',
            connection_name: `Meta: ${userProfile.name}`,
            status: 'action_required',
            credentials: {
                access_token: longLivedToken,
                user_id: userProfile.id,
                user_name: userProfile.name
            },
            metadata: {
                total_assets_available: filteredAssets.length,
                assets_preview: filteredAssets,
                waba_debug_error: wabaError
            },
            is_primary: true,
            updated_at: new Date().toISOString()
        };

        let dbError: any = null;
        if (existingConnection?.id) {
            console.log("Updating existing connection:", existingConnection.id);
            const { error } = await supabase
                .from('integration_connections')
                .update(connectionPayload)
                .eq('id', existingConnection.id);
            dbError = error;
        } else {
            console.log("Inserting new connection");
            const { error } = await supabase
                .from('integration_connections')
                .insert(connectionPayload);
            dbError = error;
        }

        if (dbError) {
            console.error("DB Save Error:", dbError);
            return createClientRedirect(appUrl, '/platform/integrations', {
                error: 'db_save_failed',
                desc: dbError.message || ''
            });
        }

        return createClientRedirect(appUrl, '/platform/integrations', {
            success: 'meta_connected',
            action: 'configure_assets'
        });

    } catch (err: any) {
        console.error("Meta Exchange Failed:", err);
        return createClientRedirect(appUrl, '/platform/integrations', {
            error: 'exchange_failed',
            desc: err.message
        });
    }
}
