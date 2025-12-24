
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

export interface MetaAd {
    id: string
    name: string
    status: string
    creative?: {
        thumbnail_url?: string
    }
    insights?: {
        data: Array<{
            spend: string
            impressions: string
            clicks: string
            ctr: string
            cpc: string
        }>
    }
}

export interface MetaCampaign {
    id: string
    name: string
    status: string
    objective?: string
    daily_budget?: string
    lifetime_budget?: string
    ads?: {
        data: MetaAd[]
    }
    insights?: {
        data: Array<{
            spend: string
            impressions: string
            clicks: string
            cpc: string
            ctr: string
            actions?: Array<{ action_type: string; value: string }>
            cost_per_action_type?: Array<{ action_type: string; value: string }>
        }>
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
        impressions: number
        clicks: number
        ctr: number
        cpc: number
        daily_budget?: number
        lifetime_budget?: number
        conversions: number
        cost_per_conversion: number
        ads: Array<{
            id: string
            name: string
            status: string
            spend: number
            impressions: number
            clicks: number
            ctr: number
            cpc: number
            conversions: number
            cost_per_conversion: number
            thumbnail_url?: string
        }>
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
