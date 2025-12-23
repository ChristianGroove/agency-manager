
import { MetaConnector } from './connector'
import { MetaAdAccountInsights, NormalizedAdsMetrics } from './types'

export class AdsService {
    private connector: MetaConnector

    constructor(connector: MetaConnector) {
        this.connector = connector
    }

    async getMetrics(adAccountId: string): Promise<NormalizedAdsMetrics> {
        // 1. Fetch Account Level Insights
        const insightsData = await this.connector.getAdAccountInsights(adAccountId)
        const accountInsights = insightsData.data?.[0] || {}

        // 2. Fetch Active Campaigns
        // Note: In a real implementation, we would call connector.getCampaigns(adAccountId)
        // For now, we stub this or assume the connector would handle it.
        // Let's assume we implement getCampaigns in connector or use generic fetchGraph

        // Mocking campaigns for now as I need to extend connector to support this
        // or just use generic fetchGraph here.

        const campaignsData = await this.fetchCampaigns(adAccountId)

        return this.normalize(accountInsights, campaignsData)
    }

    private async fetchCampaigns(adAccountId: string) {
        try {
            const data = await this.connector.getCampaigns(adAccountId)
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
            roas: parseFloat(insights.roas || '0'), // Meta often returns 'purchase_roas' as custom metric
            campaigns: campaigns.map(c => ({
                id: c.id,
                name: c.name,
                status: c.status,
                spend: parseFloat(c.insights?.data?.[0]?.spend || '0')
            })).sort((a, b) => b.spend - a.spend).slice(0, 5),
            last_updated: new Date().toISOString()
        }
    }
}
