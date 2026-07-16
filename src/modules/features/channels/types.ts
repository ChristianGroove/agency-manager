export type ChannelStatus = 'active' | 'disconnected' | 'error' | 'expired' | 'connecting' | 'deleted'

export interface Channel {
    id: string
    organization_id: string
    provider_key: 'meta_whatsapp' | 'whatsapp_cloud' | 'evolution_api' | 'meta_instagram' | 'meta_business' | 'facebook_page' | 'instagram_dm' | 'instagram_dme' | 'meta_ads_monitor'
    connection_name: string
    status: ChannelStatus
    credentials: Record<string, any>
    config: ChannelConfig
    metadata: ChannelMetadata
    default_pipeline_stage_id?: string | null
    working_hours?: WorkingHoursConfig
    auto_reply_when_offline?: string | null
    welcome_message?: string | null
    is_primary: boolean
    last_synced_at?: string
    created_at: string
}

export interface ChannelConfig {
    phone_number_id?: string
    waba_id?: string
    instance_id?: string // Evolution
    base_url?: string // Evolution
}

export interface ChannelMetadata {
    phone_number?: string
    display_phone_number?: string
    verified_name?: string
    profile_picture_url?: string
    quality_rating?: string
    selected_assets?: any[] // Meta Business Assets
    assets_preview?: any[] // Meta Business Preview
    waba_debug_error?: any // Debugging
    _virtual_asset_type?: string // For UI visuals (WABA vs Page)
}

export interface WorkingHoursConfig {
    enabled: boolean
    timezone: string
    schedule: {
        [key in 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun']?: {
            start: string
            end: string
            enabled: boolean
        }
    }
}
