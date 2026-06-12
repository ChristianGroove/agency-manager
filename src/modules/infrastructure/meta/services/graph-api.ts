

const META_API_VERSION = 'v24.0';
const META_GRAPH_URL = 'https://graph.facebook.com';
const PUBLIC_META_GRAPH_ERROR = 'Meta API request failed';
const PUBLIC_META_WEBHOOK_ERROR = 'Meta webhook subscription failed';
const PUBLIC_WABA_DISCOVERY_ERROR = 'No WhatsApp accounts found';

export interface MetaTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface MetaPage {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
        id: string;
    };
    tasks: string[];
}

function isDeployedRuntime(): boolean {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function getGraphError(error: unknown): any {
    if (error && typeof error === 'object' && 'error' in error) {
        return (error as any).error;
    }

    return error;
}

function summarizeGraphError(error: unknown) {
    const graphError = getGraphError(error);

    if (graphError instanceof Error) {
        return { name: graphError.name };
    }

    if (graphError && typeof graphError === 'object') {
        return {
            code: graphError.code,
            subcode: graphError.error_subcode || graphError.subcode,
            type: graphError.type,
            traceId: graphError.fbtrace_id,
        };
    }

    return { type: typeof graphError };
}

function logGraphError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, summarizeGraphError(error));
}

function graphErrorMessage(error: unknown, fallback: string) {
    const graphError = getGraphError(error);

    if (graphError instanceof Error && graphError.message) {
        return graphError.message;
    }

    if (graphError && typeof graphError === 'object' && typeof graphError.message === 'string') {
        return graphError.message;
    }

    return fallback;
}

function publicGraphError(error: unknown, fallback: string = PUBLIC_META_GRAPH_ERROR) {
    return isDeployedRuntime()
        ? fallback
        : graphErrorMessage(error, fallback);
}

function metaGraphFailure(prefix: string, error: unknown) {
    if (isDeployedRuntime()) {
        return new Error(prefix);
    }

    const graphError = getGraphError(error);
    const type = graphError && typeof graphError === 'object' ? graphError.type : undefined;
    const suffix = type ? ` (${type})` : '';
    return new Error(`${prefix}: ${graphErrorMessage(error, PUBLIC_META_GRAPH_ERROR)}${suffix}`);
}

function summarizeStrategyErrors(errors: any[]) {
    if (!isDeployedRuntime()) {
        return errors;
    }

    return errors.map(({ strategy, error }) => ({
        strategy,
        ...summarizeGraphError(error),
    }));
}

export class MetaGraphAPI {
    private appId: string;
    private appSecret: string;
    private redirectUri: string;

    constructor(baseUrl?: string) {
        this.appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || '25468410932828305';
        this.appSecret = process.env.META_APP_SECRET || '';

        // Priority: Passed baseUrl > Env Var > Localhost
        const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        this.redirectUri = `${appUrl}/api/integrations/meta/callback`;

        if (!this.appId || !this.appSecret) {
            console.error('[MetaGraphAPI] ⚠️ Missing Environment Variables: META_APP_ID or META_APP_SECRET');
        }
    }

    /**
     * Exchange short-lived code for long-lived user access token
     */
    async exchangeCodeForToken(code: string): Promise<string> {
        if (!this.appSecret) {
            console.error('[MetaGraphAPI] ❌ Cannot exchange token: META_APP_SECRET is not defined in environment.');
            throw new Error(`Meta Token Exchange Failed: Missing Client Secret in server configuration.`);
        }

        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/oauth/access_token`);
        url.searchParams.append('client_id', this.appId);
        url.searchParams.append('client_secret', this.appSecret);
        url.searchParams.append('redirect_uri', this.redirectUri);
        url.searchParams.append('code', code);

        console.log(`[MetaGraphAPI] Exchanging code for token... Version: ${META_API_VERSION}`);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            logGraphError('[MetaGraphAPI] Exchange Failed Error Content:', data.error);
            throw metaGraphFailure('Meta Token Exchange Failed', data.error);
        }

        return data.access_token;
    }

    /**
     * Exchange short-lived Page Access Token for long-lived Page Access Token
     * CRITICAL: Long-lived page tokens don't expire if the page admin doesn't change permissions
     * This is the recommended approach by Meta for Tech Providers
     */
    async exchangeForLongLivedPageToken(shortLivedPageToken: string): Promise<string> {
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/oauth/access_token`);
        url.searchParams.append('grant_type', 'fb_exchange_token');
        url.searchParams.append('client_id', this.appId);
        url.searchParams.append('client_secret', this.appSecret);
        url.searchParams.append('fb_exchange_token', shortLivedPageToken);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            throw metaGraphFailure('Page Token Exchange Failed', data.error);
        }

        return data.access_token;
    }

    /**
     * Subscribe webhooks for a specific Page
     * Calls /{page-id}/subscribed_apps to enable webhook delivery
     * Required permissions: pages_manage_metadata
     */
    async subscribePageWebhooks(pageId: string, pageAccessToken: string, fields: string[] = ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads']): Promise<{ success: boolean; error?: string }> {
        try {
            const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/${pageId}/subscribed_apps`);
            url.searchParams.append('access_token', pageAccessToken);
            url.searchParams.append('subscribed_fields', fields.join(','));

            const res = await fetch(url.toString(), { method: 'POST' });
            const data = await res.json();

            if (data.error) {
                logGraphError('[MetaGraphAPI] Webhook subscription failed:', data.error);
                return { success: false, error: publicGraphError(data.error, PUBLIC_META_WEBHOOK_ERROR) };
            }

            console.log('[MetaGraphAPI] ✅ Webhooks subscribed for page:', pageId);
            return { success: true };
        } catch (error: any) {
            logGraphError('[MetaGraphAPI] Webhook subscription error:', error);
            return { success: false, error: publicGraphError(error, PUBLIC_META_WEBHOOK_ERROR) };
        }
    }

    /**
     * Get valid Facebook Pages and linked Instagram Accounts
     */
    async getConnectedAssets(userAccessToken: string): Promise<MetaPage[]> {
        // Strategy 1: Standard Fetch
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/me/accounts`);
        url.searchParams.append('access_token', userAccessToken);
        url.searchParams.append('fields', 'id,name,access_token,instagram_business_account,tasks');
        url.searchParams.append('limit', '100');

        let res = await fetch(url.toString());
        let data = await res.json();

        if (data.error) {
            throw metaGraphFailure('Meta Assets Fetch Failed', data.error);
        }

        let pages = data.data as MetaPage[];

        // Strategy 2: Granular Scopes Fallback (Modern Meta APIs)
        if (pages.length === 0) {
            console.log("🔍 [MetaGraphAPI] No pages found in /me/accounts. Attempting Granular Scopes recovery...");
            try {
                const debugUrl = `${META_GRAPH_URL}/${META_API_VERSION}/debug_token?input_token=${userAccessToken}&access_token=${userAccessToken}`;
                const debugRes = await fetch(debugUrl);
                const debugBody = await debugRes.json();
                
                if (debugBody.data && debugBody.data.granular_scopes) {
                    const scopes = debugBody.data.granular_scopes;
                    const pageScope = scopes.find((s: any) => s.scope === 'pages_show_list' || s.scope === 'pages_manage_metadata');
                    
                    if (pageScope && pageScope.target_ids && pageScope.target_ids.length > 0) {
                        console.log(`🎯 [MetaGraphAPI] Found ${pageScope.target_ids.length} granted Page IDs in Granular Scopes.`);
                        
                        const pagePromises = pageScope.target_ids.map(async (pageId: string) => {
                            const pUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${pageId}?access_token=${userAccessToken}&fields=id,name,access_token,instagram_business_account`;
                            const pRes = await fetch(pUrl);
                            return pRes.json();
                        });
                        
                        const pageResults = await Promise.all(pagePromises);
                        pageResults.forEach((p: any) => {
                            if (!p.error) {
                                p.tasks = ['MANAGE']; // mock tasks to satisfy MetaPage type
                                pages.push(p as MetaPage);
                            } else {
                                logGraphError('[MetaGraphAPI] Failed to fetch granular page:', p.error);
                            }
                        });
                    }
                }
            } catch (error) {
                logGraphError("[MetaGraphAPI] Granular Scopes Fallback Error:", error);
            }
        }

        return pages;
    }

    /**
     * Get valid WhatsApp Business Accounts (WABAs)
     */
    async getWhatsAppAccounts(accessToken: string): Promise<{ data: any[], error?: any }> {
        let allWabas: any[] = [];
        let errors: any[] = [];

        try {
            console.log("🔍 [Multi-Strategy] Fetching WABAs...");

            // --- STRATEGY 1: Direct Fetch (Standard) ---
            // Works if 'whatsapp_business_management' is granted and user has direct access
            try {
                const url1 = `${META_GRAPH_URL}/${META_API_VERSION}/me/whatsapp_business_accounts?access_token=${accessToken}&fields=id,name,currency,timezone_id,message_templates,phone_numbers{id,display_phone_number,verified_name,quality_rating}`;
                const res1 = await fetch(url1);
                const body1 = await res1.json();
                if (!body1.error && body1.data) {
                    console.log(`✅ Strategy 1 (Direct) found ${body1.data.length} WABAs`);
                    allWabas = [...allWabas, ...body1.data];
                } else {
                    errors.push({ strategy: 'direct', error: body1.error });
                }
            } catch (e) { errors.push({ strategy: 'direct', error: e }); }

            // --- STRATEGY 2: Business Hierarchy (Corporate) ---
            // Works if 'business_management' is granted. Good for Agencies.
            if (allWabas.length === 0) {
                try {
                    const url2 = `${META_GRAPH_URL}/${META_API_VERSION}/me/businesses?access_token=${accessToken}&fields=id,name,whatsapp_business_accounts{id,name,currency,timezone_id,message_templates,phone_numbers{id,display_phone_number,verified_name,quality_rating}}`;
                    const res2 = await fetch(url2);
                    const body2 = await res2.json();

                    if (!body2.error && body2.data) {
                        const businesses = body2.data || [];
                        businesses.forEach((biz: any) => {
                            const bizWabas = biz.whatsapp_business_accounts?.data || [];
                            const enriched = bizWabas.map((w: any) => ({ ...w, business_name: biz.name, business_id: biz.id }));
                            allWabas = [...allWabas, ...enriched];
                        });
                        console.log(`✅ Strategy 2 (Business) found ${allWabas.length} WABAs`);
                    } else {
                        errors.push({ strategy: 'business', error: body2.error });
                    }
                } catch (e) { errors.push({ strategy: 'business', error: e }); }
            }

            // --- STRATEGY 3: Via Pages (Small Business / WhatsApp App) ---
            // Works if 'pages_read_engagement' is granted. WABA linked to Page.
            if (allWabas.length === 0) {
                try {
                    console.log("🔍 [Strategy 3] Attempting Page-Linked WABA discovery...");
                    const url3 = `${META_GRAPH_URL}/${META_API_VERSION}/me/accounts?access_token=${accessToken}&fields=id,name,connected_whatsapp_business_account{id,name,currency,timezone_id}`;
                    const res3 = await fetch(url3);
                    const body3 = await res3.json();

                    if (!body3.error && body3.data) {
                        const pages = body3.data || [];
                        let foundViaPage = 0;
                        pages.forEach((page: any) => {
                            const linkedWaba = page.connected_whatsapp_business_account;
                            if (linkedWaba && linkedWaba.id) {
                                allWabas.push({
                                    ...linkedWaba,
                                    // Add context that it came from a page connection
                                    business_name: `Vía Página: ${page.name}`
                                });
                                foundViaPage++;
                            }
                        });
                        console.log(`✅ Strategy 3 (Page-Linked) found ${foundViaPage} WABAs`);
                        if (foundViaPage === 0) {
                            errors.push({ strategy: 'pages', error: "Success (200 OK) but 'connected_whatsapp_business_account' was null/empty for all pages." });
                        }
                    } else {
                        // record error but don't stop
                        errors.push({ strategy: 'pages', error: body3.error });
                    }
                } catch (e) { errors.push({ strategy: 'pages', error: e }); }
            }

            // --- STRATEGY 4: Granular Permissions (The "Modern" Way) ---
            // If user selected WABAs in the popup, they are in the token metadata.
            if (allWabas.length === 0) {
                try {
                    console.log("🔍 [Strategy 4] Inspecting Granular Scopes...");
                    // We need the APP TOKEN to inspect the input token, strictly speaking.
                    // But often we can inspect our own token. Let's try.
                    // If that fails, we use the user token as both input and access_token (works for some calls)
                    // Ideally: GET /debug_token?input_token={user_token}&access_token={user_token}

                    const debugUrl = `${META_GRAPH_URL}/${META_API_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
                    const debugRes = await fetch(debugUrl);
                    const debugBody = await debugRes.json();

                    if (debugBody.data && debugBody.data.granular_scopes) {
                        const scopes = debugBody.data.granular_scopes;
                        const wabaScope = scopes.find((s: any) => s.scope === 'whatsapp_business_management');

                        if (wabaScope && wabaScope.target_ids) {
                            console.log(`🎯 Strategy 4 found ${wabaScope.target_ids.length} allowed WABA IDs:`, wabaScope.target_ids);

                            // Now fetch details for each ID
                            const wabaPromises = wabaScope.target_ids.map(async (id: string) => {
                                const wUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${id}?access_token=${accessToken}&fields=id,name,currency,timezone_id,message_templates,phone_numbers{id,display_phone_number,verified_name,quality_rating}`;
                                const wRes = await fetch(wUrl);
                                return wRes.json();
                            });

                            const wabaResults = await Promise.all(wabaPromises);
                            wabaResults.forEach((w: any) => {
                                if (!w.error) {
                                    allWabas.push({ ...w, business_name: 'Granular Access' });
                                }
                            });
                        } else {
                            errors.push({ strategy: 'granular_token', error: "No 'whatsapp_business_management' target_ids found in token." });
                        }
                    } else {
                        // This usually means granular scopes aren't active or token isn't inspectable by itself
                        errors.push({ strategy: 'granular_token', error: debugBody.error || "No granular_scopes in debug_token response." });
                    }
                } catch (e) { errors.push({ strategy: 'granular_token', error: e }); }
            }

            // Deduplicate results by ID
            const uniqueWabas = Array.from(new Map(allWabas.map(item => [item.id, item])).values());

            if (uniqueWabas.length > 0) {
                return { data: uniqueWabas };
            }

            // If completely failed, return detailed report of ALL strategies
            const safeErrors = summarizeStrategyErrors(errors);
            console.error("❌ All WABA strategies failed:", safeErrors);
            return {
                data: [],
                error: {
                    message: isDeployedRuntime()
                        ? PUBLIC_WABA_DISCOVERY_ERROR
                        : "No se encontraron cuentas de WhatsApp con ninguno de los métodos.",
                    strategies_attempted: safeErrors
                }
            };

        } catch (error: any) {
            logGraphError("❌ Critical WABA Fetch Error:", error);
            return {
                data: [],
                error: isDeployedRuntime()
                    ? { message: PUBLIC_WABA_DISCOVERY_ERROR }
                    : error
            };
        }
    }

    /**
     * Get Instagram Business Account Username
     */
    async getInstagramUsername(instagramBusinessId: string, accessToken: string): Promise<string | null> {
        try {
            const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/${instagramBusinessId}`);
            url.searchParams.append('access_token', accessToken);
            url.searchParams.append('fields', 'username');

            const res = await fetch(url.toString());
            const data = await res.json();

            if (data.error) {
                logGraphError('[MetaGraphAPI] Instagram username fetch failed:', data.error);
                return null;
            }

            return data.username || null;
        } catch (error) {
            logGraphError('[MetaGraphAPI] Instagram username fetch error:', error);
            return null;
        }
    }

    /**
     * Get User Profile (Name, ID)
     */
    async getUserProfile(userAccessToken: string) {
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/me`);
        url.searchParams.append('access_token', userAccessToken);
        url.searchParams.append('fields', 'id,name,email');

        const res = await fetch(url.toString());
        return await res.json();
    }

    /**
     * Get Ad Accounts
     */
    async getAdAccounts(accessToken: string): Promise<any[]> {
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/me/adaccounts`);
        url.searchParams.append('access_token', accessToken);
        url.searchParams.append('fields', 'id,name,account_id,currency');
        url.searchParams.append('limit', '100');

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            logGraphError('[MetaGraphAPI] Ad Accounts Fetch Failed:', data.error);
            // Don't throw, just return empty to avoid breaking the whole flow
            return [];
        }

        return data.data || [];
    }
}
