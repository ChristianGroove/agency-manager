export type SystemModule = {
    id: string
    key: string
    name: string
    description: string | null
    category: 'core' | 'addon' | 'special'
    is_active: boolean
    created_at: string
}

export interface SaasApp {
    id: string
    name: string
    slug: string
    description: string
    long_description?: string
    category: string
    vertical_compatibility: string[]
    icon: string
    color: string
    banner_image_url?: string
    price_monthly: number
    trial_days: number
    features?: string[]
    pricing_plans?: Record<string, number>
    is_active: boolean
    is_featured: boolean
    sort_order: number
    metadata?: Record<string, any>
    created_at: string
    status?: string
    space_category?: 'agency' | 'resto' | 'cleaning' | 'platform' | 'retail' | 'saas'
}

export interface AppModule {
    id: string
    app_id: string
    module_key: string
    auto_enable: boolean
    is_core: boolean
    is_optional: boolean
    sort_order: number
}

export interface AppAddOn {
    id: string
    app_id: string
    add_on_type: string
    tier_id?: string
    is_recommended: boolean
    is_required: boolean
    discount_percent: number
    display_order: number
}

export interface AppWithDetails extends SaasApp {
    modules: AppModule[]
    recommended_add_ons: AppAddOn[]
    module_count: number
    active_org_count: number
}
