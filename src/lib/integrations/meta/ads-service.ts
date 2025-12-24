
import { MetaConnector } from './connector'
import { MetaAdAccountInsights, NormalizedAdsMetrics } from './types'

export class AdsService {
    private connector: MetaConnector

    constructor(connector: MetaConnector) {
        this.connector = connector
    }

    async getMetrics(adAccountId: string, datePreset: string = 'last_30d'): Promise<NormalizedAdsMetrics> {
        // 1. Fetch Account Level Insights
        const insightsData = await this.connector.getAdAccountInsights(adAccountId, datePreset)
        const accountInsights = insightsData.data?.[0] || {}

        // 2. Fetch Active Campaigns with nested Ads
        const campaignsData = await this.fetchCampaigns(adAccountId, datePreset)

        return this.normalize(accountInsights, campaignsData)
    }

    private async fetchCampaigns(adAccountId: string, datePreset: string) {
        try {
            const data = await this.connector.getCampaigns(adAccountId, datePreset)
            return data.data || []
        } catch (error) {
            console.warn(`[AdsService] Failed to fetch campaigns for ${adAccountId}`, error)
            return []
        }
    }

    private normalize(insights: any, campaigns: any[]): NormalizedAdsMetrics {
        return {
            spend: parseFloat(insights.spend || '0'),
            impressions: parseInt(insights.impressions || '0'),
            clicks: parseInt(insights.clicks || '0'),
            ctr: parseFloat(insights.ctr || '0'),
            cpc: parseFloat(insights.cpc || '0'),
            roas: parseFloat(insights.roas || insights.purchase_roas?.[0]?.value || '0'),
            campaigns: campaigns.map(c => {
                const campaignInsights = c.insights?.data?.[0] || {}
                const spend = parseFloat(campaignInsights.spend || '0')

                // Helper to find best conversion metric using Priority Tiers
                const getConversionMetric = (actions: any[], objective: string, totalSpend: number) => {
                    if (!actions || actions.length === 0) return { count: 0, cost: 0 }

                    // Tier 1: Hard Conversions (Purchases, Leads, Messages) - The likely "Result"
                    const tier1 = [
                        'purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'mobile_app_purchase',
                        'lead', 'on_facebook_lead', 'offsite_conversion.fb_pixel_lead', 'omni_lead',
                        'onsite_conversion.messaging_conversation_started_7d',
                        'onsite_conversion.messaging_first_reply'
                    ]

                    // Tier 2: Soft Conversions (Clicks, Landing Page Views) - Fallback for Traffic/Sales
                    const tier2 = [
                        'link_click', 'outbound_click', 'landing_page_view'
                    ]

                    // Tier 3: Awareness/Engagement (Views, Likes) - Fallback for Awareness
                    const tier3 = [
                        'post_engagement', 'page_engagement', 'video_view', 'omni_app_install'
                    ]

                    const sumActions = (types: string[]) => {
                        return actions.reduce((sum, action) => {
                            if (types.includes(action.action_type)) {
                                return sum + parseInt(action.value)
                            }
                            return sum
                        }, 0)
                    }

                    // 1. Check Tier 1
                    let total = sumActions(tier1)

                    // 2. If no Tier 1, and objective allows, check Tier 2
                    if (total === 0) {
                        // For Awareness, we might skip Tier 2 unless strictly needed? 
                        // But usually Traffic campaigns want Clicks.
                        total = sumActions(tier2)
                    }

                    // 3. If still 0, check Tier 3 (mostly for Awareness/Engagement campaigns that failed to get messages)
                    if (total === 0) {
                        total = sumActions(tier3)
                    }

                    return {
                        count: total,
                        cost: total > 0 ? (totalSpend / total) : 0
                    }
                }

                const conversionData = getConversionMetric(campaignInsights.actions, c.objective, spend)

                return {
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : undefined,
                    lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : undefined,
                    spend: spend,
                    impressions: parseInt(campaignInsights.impressions || '0'),
                    clicks: parseInt(campaignInsights.clicks || '0'),
                    ctr: parseFloat(campaignInsights.ctr || '0'),
                    cpc: parseFloat(campaignInsights.cpc || '0'),
                    conversions: conversionData.count,
                    cost_per_conversion: conversionData.cost,
                    ads: (c.ads?.data || []).map((ad: any) => {
                        const adInsights = ad.insights?.data?.[0] || {}
                        const adSpend = parseFloat(adInsights.spend || '0')
                        const adConversionData = getConversionMetric(adInsights.actions, c.objective, adSpend)
                        return {
                            id: ad.id,
                            name: ad.name,
                            status: ad.status,
                            thumbnail_url: ad.creative?.thumbnail_url,
                            spend: adSpend,
                            impressions: parseInt(adInsights.impressions || '0'),
                            clicks: parseInt(adInsights.clicks || '0'),
                            ctr: parseFloat(adInsights.ctr || '0'),
                            cpc: parseFloat(adInsights.cpc || '0'),
                            conversions: adConversionData.count,
                            cost_per_conversion: adConversionData.cost
                        }
                    }).sort((a: any, b: any) => b.spend - a.spend)
                }
            }).sort((a, b) => b.spend - a.spend),
            last_updated: new Date().toISOString()
        }
    }
}
