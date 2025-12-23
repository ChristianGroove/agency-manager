
export interface MetaAdAccountInsights {
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    roas: number
    date_start: string
    date_stop: string
}

export interface MetaCampaign {
    id: string
    name: string
    status: string
    insights?: {
        spend: number
        impressions: number
        clicks: number
    }
}

export interface MetaSocialInsights {
    page_impressions: number
    page_post_engagements: number
    page_fans: number
    page_impressions_unique: number
}

export interface MetaPost {
    id: string
    message?: string
    created_time: string
    permalink_url: string
    full_picture?: string
    insights?: {
        reach: number
        engagement: number
    }
}

export interface NormalizedAdsMetrics {
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    roas: number
    campaigns: Array<{
        id: string
        name: string
        status: string
        spend: number
    }>
    last_updated: string
}

export interface ChannelMetrics {
    followers: number
    reach: number
    engagement: number
    impressions: number
    top_posts: Array<{
        id: string
        message: string
        image: string
        reach: number
        engagement: number
        date: string
        url: string
    }>
}

export interface NormalizedSocialMetrics {
    facebook: ChannelMetrics
    instagram?: ChannelMetrics
    last_updated: string
}
