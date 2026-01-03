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
    category: string
    logo?: string
    image?: string
    price_monthly: number
    pricing_model?: string
    features?: string[]
    metadata?: any
    is_active: boolean
    created_at: string
}

export type SaaSProductModule = {
    product_id: string
    module_id: string
    is_default_enabled: boolean
}
