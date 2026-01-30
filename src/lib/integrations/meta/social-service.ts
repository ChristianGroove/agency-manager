import { MetaConnector } from './connector'
import { MetaSocialInsights, NormalizedSocialMetrics, MetaPost } from './types'

export class SocialService {
    private connector: MetaConnector

    constructor(connector: MetaConnector) {
        this.connector = connector
    }

    async getMetrics(pageId: string): Promise<NormalizedSocialMetrics> {
        // 1. Fetch Page Level Insights (includes IG ID)
        const fbInsightsData = await this.connector.getPageInsights(pageId)

        // 2. Fetch FB Posts (using Page Token if available)
        const pageAccessToken = (fbInsightsData as any).page_access_token
        const fbPostsData = await this.fetchPosts(pageId, pageAccessToken)

        // 3. Normalize Facebook Data
        const facebookMetrics = this.parseChannelMetrics(
            fbInsightsData.data || [],
            fbInsightsData.fan_count || 0,
            fbPostsData,
            'facebook'
        )
        const igUserId = (fbInsightsData as any).instagram_business_account?.id

        let instagramMetricsData: any[] = []
        let instagramFollowers = 0
        let instagramPosts: MetaPost[] = []
        let instagramMetrics: any = undefined

        // 4. Fetch Instagram Data (if IG ID exists)
        if (igUserId) {
            const igInsightsData = await this.connector.getInstagramInsights(igUserId)
            instagramMetricsData = igInsightsData.data || []
            instagramFollowers = igInsightsData.followers_count || 0
            instagramPosts = await this.fetchIGPosts(igUserId)

            instagramMetrics = this.parseChannelMetrics(
                instagramMetricsData,
                instagramFollowers,
                instagramPosts,
                'instagram'
            )
        }

        return {
            facebook: facebookMetrics,
            instagram: instagramMetrics,
            last_updated: new Date().toISOString()
        }
    }

    private parseChannelMetrics(data: any[], followers: number, posts: MetaPost[], channel: 'facebook' | 'instagram'): any {
        // Common parser for both, with map overrides if needed
        const getMetric = (name: string) => {
            const m = data.find(d => d.name === name)
            return m?.values?.[0]?.value || 0
        }

        let reach = 0, engagement = 0, impressions = 0;

        if (channel === 'facebook') {
            impressions = getMetric('page_impressions')
            reach = getMetric('page_impressions_unique')
            engagement = getMetric('page_engaged_users') || getMetric('page_post_engagements')
        } else {
            // Instagram Metrics
            impressions = getMetric('impressions')
            reach = getMetric('reach')
            engagement = getMetric('accounts_engaged')
        }

        return {
            followers,
            reach,
            engagement,
            impressions,
            top_posts: posts.map(p => ({
                id: p.id,
                message: p.message || '',
                image: p.full_picture || '',
                reach: p.insights?.reach || 0,
                engagement: p.insights?.engagement || 0,
                date: p.created_time,
                url: p.permalink_url
            }))
        }
    }

    private async fetchPosts(pageId: string, pageAccessToken?: string): Promise<MetaPost[]> {
        // Facebook Posts
        try {
            const data = await this.connector.getPosts(pageId, pageAccessToken)
            return (data.data || []).map((p: any) => ({
                id: p.id,
                message: p.message,
                full_picture: p.full_picture,
                created_time: p.created_time,
                permalink_url: p.permalink_url,
                insights: {
                    reach: (p.insights?.data?.find((m: any) => m.name === 'post_impressions_unique')?.values?.[0]?.value) || 0,
                    engagement: (p.insights?.data?.find((m: any) => m.name === 'post_engaged_users')?.values?.[0]?.value) || 0
                }
            }))
        } catch (error) {
            console.warn(`[SocialService] Failed to fetch FB posts`, error)
            return []
        }
    }

    private async fetchIGPosts(igUserId: string): Promise<MetaPost[]> {
        // Instagram Media
        try {
            const data = await this.connector.getInstagramPosts(igUserId)
            return (data.data || []).map((p: any) => ({
                id: p.id,
                message: p.caption,
                full_picture: p.media_url || p.thumbnail_url, // Video thumbnails
                created_time: p.timestamp,
                permalink_url: p.permalink,
                insights: {
                    reach: 0,
                    engagement: (p.like_count || 0) + (p.comments_count || 0) // Proxy for engagement
                }
            }))
        } catch (error) {
            console.warn(`[SocialService] Failed to fetch IG posts`, error)
            return []
        }
    }
}
