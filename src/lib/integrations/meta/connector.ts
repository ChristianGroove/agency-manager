
export class MetaConnector {
    private readonly baseUrl = 'https://graph.facebook.com/v19.0'
    private accessToken: string

    constructor(accessToken: string) {
        this.accessToken = accessToken
    }

    /**
     * Generic fetch method for Graph API
     */
    private async fetchGraph(endpoint: string, params: Record<string, string> = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`)
        url.searchParams.append('access_token', this.accessToken)

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value)
        })

        try {
            const response = await fetch(url.toString())
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Meta API Error')
            }

            return data
        } catch (error) {
            console.error('Meta API Request Failed:', error)
            throw error
        }
    }

    /**
     * Get Ad Account Insights
     */
    async getAdAccountInsights(adAccountId: string) {
        // Implementation for Ads
        return this.fetchGraph(`/${adAccountId}/insights`, {
            date_preset: 'last_30d',
            fields: 'spend,impressions,clicks,cpc,ctr'
        })
    }

    async getPageInsights(pageId: string) {
        // 1. Try to get Page Access Token & Fan Count & IG Account
        let pageAccessToken = this.accessToken
        let fanCount = 0
        let igBusinessId = null

        try {
            const pageData = await this.fetchGraph(`/${pageId}`, {
                fields: 'access_token,fan_count,instagram_business_account,name'
            })
            if (pageData.access_token) {
                pageAccessToken = pageData.access_token
            }
            if (pageData.fan_count) {
                fanCount = pageData.fan_count
            }
            if (pageData.instagram_business_account?.id) {
                igBusinessId = pageData.instagram_business_account.id
            }
        } catch (e) {
            console.warn(`[MetaConnector] Failed to fetch Page Token/IG for ${pageId}, using User Token.`, e)
        }

        // 2. Fetch FB Insights Individually
        const metricsToFetch = [
            'page_impressions',
            'page_impressions_unique',
            'page_engaged_users'
        ]

        const metricResults: any[] = []

        await Promise.all(metricsToFetch.map(async (metric) => {
            const url = new URL(`${this.baseUrl}/${pageId}/insights`)
            url.searchParams.append('access_token', pageAccessToken)
            url.searchParams.append('period', 'days_28')
            url.searchParams.append('metric', metric)

            try {
                const response = await fetch(url.toString())
                const json = await response.json()
                if (!response.ok) {
                    console.warn(`[MetaConnector] Failed to fetch ${metric}:`, json.error?.message)
                    return
                }
                if (json.data && Array.isArray(json.data)) {
                    metricResults.push(...json.data)
                }
            } catch (err) {
                console.error(`[MetaConnector] Network error fetching ${metric}:`, err)
            }
        }))

        return {
            data: metricResults,
            fan_count: fanCount,
            ig_business_id: igBusinessId,
            page_access_token: pageAccessToken
        }
    }

    /**
     * Get Instagram Insights
     */
    async getInstagramInsights(igUserId: string) {
        // Fetch IG insights
        // metric=impressions,reach,accounts_engaged (v19)
        // profile_views is also common
        // IG insights often require period=day or lifetime depending on metric,
        // but for these simplified metrics, period=day with date_preset usually works or just range.
        // Actually for User (Business) Insights:
        // period is required: day, week, days_28, month, lifetime
        // impressions, reach: days_28 is good.
        // follower_count: can be fetched from the node directly usually.

        // 1. Get Follower Count from Node
        let followers = 0
        try {
            const igAccount = await this.fetchGraph(`/${igUserId}`, {
                fields: 'followers_count'
            })
            if (igAccount.followers_count) followers = igAccount.followers_count
        } catch (e) {
            console.warn('[MetaConnector] Failed to fetch IG followers', e)
        }

        // 2. Get Insights
        const metrics = 'impressions,reach,accounts_engaged'
        const insightsResults: any[] = []

        // Helper to fetch with period
        const fetchWithPeriod = async (period: string) => {
            const url = new URL(`${this.baseUrl}/${igUserId}/insights`)
            url.searchParams.append('access_token', this.accessToken)
            url.searchParams.append('metric', metrics)
            url.searchParams.append('period', period)

            const response = await fetch(url.toString())
            const json = await response.json()

            if (!response.ok) throw new Error(json.error?.message || 'IG API Error')
            return json.data || []
        }

        try {
            // Try 28 days first (ideal for dashboard)
            const data = await fetchWithPeriod('days_28')
            insightsResults.push(...data)
        } catch (e: any) {
            console.warn('[MetaConnector] IG Insights (days_28) failed, retrying with period="day"', e.message)
            try {
                // Fallback to 'day' (usually supported)
                const data = await fetchWithPeriod('day')
                insightsResults.push(...data)
            } catch (retryErr: any) {
                console.error('[MetaConnector] IG Insights (day) also failed:', retryErr.message)
            }
        }

        return {
            data: insightsResults,
            followers_count: followers
        }
    }

    /**
     * Get Instagram Posts
     */
    async getInstagramPosts(igUserId: string) {
        try {
            // Try rich media first
            return await this.fetchGraph(`/${igUserId}/media`, {
                fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
                limit: '5'
            })
        } catch (error) {
            console.warn('[MetaConnector] Failed to fetch IG rich media, retrying minimal...', error)
            // Fallback: Minimal
            try {
                return await this.fetchGraph(`/${igUserId}/media`, {
                    fields: 'id,caption,permalink,timestamp',
                    limit: '5'
                })
            } catch (retryError) {
                console.error('[MetaConnector] Failed to fetch IG media (minimal):', retryError)
                return { data: [] }
            }
        }
    }

    /**
     * Get Active Campaigns with basic insights
     */
    async getCampaigns(adAccountId: string) {
        // Fetch campaigns, filtering for active ones
        return this.fetchGraph(`/${adAccountId}/campaigns`, {
            fields: 'id,name,status,insights.date_preset(last_30d){spend}',
            effective_status: '["ACTIVE"]',
            limit: '10'
        })
    }

    /**
     * Get Page Posts (Facebook)
     */
    async getPosts(pageId: string, pageAccessToken?: string) {
        // Use Page Token if available, otherwise fallback to User Token (this.accessToken)
        const token = pageAccessToken || this.accessToken

        // Helper to fetch with specific token
        const fetchWithToken = async (fields: string) => {
            const url = new URL(`${this.baseUrl}/${pageId}/posts`)
            url.searchParams.append('access_token', token)
            url.searchParams.append('fields', fields)
            url.searchParams.append('limit', '5')

            const response = await fetch(url.toString())
            const json = await response.json()
            if (!response.ok) throw new Error(json.error?.message || 'FB Posts API Error')
            return json
        }

        // Safe Mode: Try standard fields first
        try {
            return await fetchWithToken('id,message,created_time,permalink_url,full_picture')
        } catch (error) {
            console.warn('[MetaConnector] Failed to fetch FB posts (standard), retrying minimal...', error)
            // Fallback: Minimal fields (no picture)
            try {
                return await fetchWithToken('id,message,created_time,permalink_url')
            } catch (retryError) {
                console.error('[MetaConnector] Failed to fetch FB posts (minimal):', retryError)
                return { data: [] }
            }
        }
    }
}
