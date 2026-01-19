
const META_API_VERSION = 'v19.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

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

export class MetaGraphAPI {
    private appId: string;
    private appSecret: string;
    private redirectUri: string;

    constructor() {
        this.appId = process.env.NEXT_PUBLIC_META_APP_ID || '812673724531634';
        this.appSecret = process.env.META_APP_SECRET || '';
        // Dynamic redirect URI based on environment would be better, but consistent with frontend for now
        this.redirectUri = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`
            : 'http://localhost:3000/api/integrations/meta/callback';

        if (!this.appId || !this.appSecret) {
            console.error('[MetaGraphAPI] Missing Environment Variables: META_APP_ID or META_APP_SECRET');
        }
    }

    /**
     * Exchange short-lived code for long-lived user access token
     */
    async exchangeCodeForToken(code: string): Promise<string> {
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/oauth/access_token`);
        url.searchParams.append('client_id', this.appId);
        url.searchParams.append('client_secret', this.appSecret);
        url.searchParams.append('redirect_uri', this.redirectUri);
        url.searchParams.append('code', code);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            throw new Error(`Meta Token Exchange Failed: ${data.error.message}`);
        }

        return data.access_token;
    }

    /**
     * Get valid Facebook Pages and linked Instagram Accounts
     */
    async getConnectedAssets(userAccessToken: string): Promise<MetaPage[]> {
        // Fetch pages with their access tokens and connected instagram accounts
        const url = new URL(`${META_GRAPH_URL}/${META_API_VERSION}/me/accounts`);
        url.searchParams.append('access_token', userAccessToken);
        url.searchParams.append('fields', 'id,name,access_token,instagram_business_account,tasks');
        url.searchParams.append('limit', '100');

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            throw new Error(`Meta Assets Fetch Failed: ${data.error.message}`);
        }

        return data.data as MetaPage[];
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
            console.error("❌ All WABA strategies failed:", JSON.stringify(errors, null, 2));
            return {
                data: [],
                error: {
                    message: "No se encontraron cuentas de WhatsApp con ninguno de los métodos.",
                    strategies_attempted: errors
                }
            };

        } catch (error: any) {
            console.error("❌ Critical WABA Fetch Error:", error);
            return { data: [], error: error };
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
}
