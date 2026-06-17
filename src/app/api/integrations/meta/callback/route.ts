import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseMetaOAuthState } from "@/modules/infrastructure/meta/services/oauth-state";

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function sanitizeMetaCallbackContext(context: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set(['connectionId', 'userName', 'wabaId']);

    return Object.fromEntries(
        Object.entries(context).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)];
            }

            return [key, value];
        })
    );
}

function logMetaCallbackInfo(label: string, context: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, context);
        return;
    }

    console.log(label, sanitizeMetaCallbackContext(context));
}

function logMetaCallbackError(label: string, error: unknown, context?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        console.error(label, error, context || '');
        return;
    }

    console.error(label, {
        ...sanitizeMetaCallbackContext(context),
        detail: error instanceof Error ? { name: error.name } : { type: typeof error }
    });
}

function sanitizeAssetsPreviewForMetadata(assets: any[]) {
    return assets.map((asset) => {
        const {
            access_token: _accessToken,
            page_access_token: _pageAccessToken,
            token: _token,
            ...safeAsset
        } = asset;

        return safeAsset;
    });
}

function errorRedirectParams(error: string, publicDesc: string, detail?: string | null): Record<string, string> {
    const desc = isDeployedRuntime() ? publicDesc : detail;
    const params: Record<string, string> = { error };
    if (desc) params.desc = desc;
    return params;
}

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
    <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
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
        logMetaCallbackError("Meta OAuth Error:", errorDesc || error, { providerError: true });
        return createClientRedirect(
            appUrl,
            '/platform/integrations',
            errorRedirectParams('meta_oauth_failed', 'Meta authorization failed', errorDesc)
        );
    }

    if (!code || !state) {
        console.error("Meta OAuth Missing Params:", { code: !!code, state: !!state });
        return createClientRedirect(appUrl, '/platform/integrations', {
            error: 'missing_params'
        });
    }

    // 2. Verify State before exchanging code or mutating credentials.
    const parsedState = parseMetaOAuthState(state);
    if (!parsedState.ok) {
        logMetaCallbackError("Meta OAuth Invalid State:", parsedState.error);
        return createClientRedirect(
            appUrl,
            '/platform/integrations',
            errorRedirectParams('invalid_state', 'Invalid Meta OAuth state', parsedState.error)
        );
    }

    // NEW: Contact Connectivity Flow
    if (parsedState.state.flow === 'contact_connect') {
        const clientId = parsedState.state.clientId;
        if (!clientId) return createClientRedirect(appUrl, '/platform/integrations', { error: 'missing_client_id' });

        try {
            const { MetaGraphAPI } = await import('@/modules/infrastructure/meta/services/graph-api');
            const metaApi = new MetaGraphAPI(appUrl);

            // Exchange for Long Lived Token
            const longLivedToken = await metaApi.exchangeCodeForToken(code);

            // Store partial config directly; asset selection is completed in the UI.
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
                window.opener.postMessage({ type: 'META_CONNECT_SUCCESS', clientId: ${JSON.stringify(clientId)} }, ${JSON.stringify(appUrl)});
                window.close();
            </script>
            </body></html>`;
            return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });

        } catch (e: any) {
            logMetaCallbackError("Contact Connect Error:", e);
            return createClientRedirect(
                appUrl,
                '/platform/integrations',
                errorRedirectParams('contact_connect_failed', 'Meta contact connection failed', e.message)
            );
        }
    }

    const orgId = parsedState.state.orgId;
    const channelType = parsedState.state.channelType;
    const isGranularConnection = !!channelType;

    // 3. Exchange Code for Token & Get Assets
    try {
        const { MetaGraphAPI } = await import('@/modules/infrastructure/meta/services/graph-api');
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
                logMetaCallbackInfo('[MetaCallback] Starting Bulk Sync', { wabasCount: wabas.length });

                try {
                    const { wabaSubscriptionManager } = await import('@/modules/infrastructure/meta/services/waba-subscription-manager');

                    const subscriptionPayload = wabas.map((w: any) => ({
                        wabaId: w.id,
                        accessToken: longLivedToken
                    }));

                    const results = await wabaSubscriptionManager.batchSubscribe(subscriptionPayload);

                    const successCount = results.filter(r => r.success).length;
                    logMetaCallbackInfo('[MetaCallback] Bulk Sync Complete', {
                        successCount,
                        wabasCount: wabas.length,
                    });

                    // Log failures if any
                    results.filter(r => !r.success).forEach(r => {
                        logMetaCallbackError('[MetaCallback] Failed to subscribe WABA:', r.error, { wabaId: r.wabaId });
                    });

                } catch (syncError) {
                    logMetaCallbackError('[MetaCallback] Bulk Sync Failed:', syncError);
                    // We don't block the flow, but we log the critical error
                }
            }
        }

        logMetaCallbackInfo('[MetaCallback] Meta Connected', {
            userName: userProfile.name,
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
            const { activateMetaChannel } = await import('@/modules/infrastructure/integrations/marketplace/meta-channel-actions');

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
                        wabaId: asset.waba_id,
                        pageId: asset.page_id
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
                return createClientRedirect(
                    appUrl,
                    '/crm/settings/channels',
                    errorRedirectParams('no_channels_created', 'No Meta channels were created', errorMessages.join(', '))
                );
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
                assets_preview: sanitizeAssetsPreviewForMetadata(filteredAssets),
                waba_debug_error: wabaError
            },
            is_primary: true,
            updated_at: new Date().toISOString()
        };

        let dbError: any = null;
        if (existingConnection?.id) {
            logMetaCallbackInfo('[MetaCallback] Updating existing connection', { connectionId: existingConnection.id });
            const { error } = await supabase
                .from('integration_connections')
                .update(connectionPayload)
                .eq('id', existingConnection.id);
            dbError = error;
        } else {
            logMetaCallbackInfo('[MetaCallback] Inserting new connection');
            const { error } = await supabase
                .from('integration_connections')
                .insert(connectionPayload);
            dbError = error;
        }

        if (dbError) {
            logMetaCallbackError("DB Save Error:", dbError);
            return createClientRedirect(
                appUrl,
                '/platform/integrations',
                errorRedirectParams('db_save_failed', 'Meta connection could not be saved', dbError.message)
            );
        }

        return createClientRedirect(appUrl, '/platform/integrations', {
            success: 'meta_connected',
            action: 'configure_assets'
        });

    } catch (err: any) {
        logMetaCallbackError("Meta Exchange Failed:", err);
        return createClientRedirect(
            appUrl,
            '/platform/integrations',
            errorRedirectParams('exchange_failed', 'Meta connection failed', err.message)
        );
    }
}
