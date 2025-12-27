export type SystemModule = {
    id: string
    key: string
    name: string
    description: string | null
    category: 'core' | 'addon' | 'special'
    is_active: boolean
    created_at: string
}

export type SaaSProduct = {
    id: string
    name: string
    slug: string
    description: string | null
    pricing_model: 'subscription' | 'one_time'
    base_price: number
    status: 'draft' | 'published' | 'archived'
    created_at: string
    modules?: SystemModule[] // Joined modules
}

export type SaaSProductModule = {
    product_id: string
    module_id: string
    is_default_enabled: boolean
}
