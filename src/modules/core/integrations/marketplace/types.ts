// Types for Integration Marketplace

export interface IntegrationProvider {
    id: string
    key: string
    name: string
    description: string | null
    category: 'messaging' | 'payments' | 'productivity' | 'ai' | 'crm' | 'other'
    icon_url: string | null
    is_premium: boolean
    is_enabled: boolean
    config_schema: ConfigSchema
    documentation_url: string | null
    setup_instructions: string | null
    created_at: string
    updated_at: string
}

export interface ConfigSchema {
    required: string[]
    properties: Record<string, {
        type: string
        title: string
        description?: string
        format?: string
        default?: any
    }>
}

export interface InstalledIntegration {
    id: string
    organization_id: string
    provider_id: string | null
    provider_key: string
    connection_name: string
    status: 'active' | 'disconnected' | 'error' | 'expired' | 'connecting' | 'deleted'
    credentials: Record<string, any>
    config: Record<string, any>
    metadata: Record<string, any>
    is_primary: boolean
    last_synced_at: string | null
    created_at: string
    provider?: IntegrationProvider
}

export interface MarketplaceCategory {
    key: string
    name: string
    description: string
    icon: string
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
    { key: 'messaging', name: 'Mensajería', description: 'WhatsApp, Instagram, Telegram y más', icon: '💬' },
    { key: 'payments', name: 'Pagos', description: 'Stripe, PSE, Wompi y pasarelas', icon: '💳' },
    { key: 'productivity', name: 'Productividad', description: 'Calendarios, tareas y documentos', icon: '📅' },
    { key: 'ai', name: 'Inteligencia Artificial', description: 'OpenAI, Claude y modelos LLM', icon: '🤖' },
    { key: 'crm', name: 'CRM & Ventas', description: 'HubSpot, Pipedrive y más', icon: '📊' },
    { key: 'other', name: 'Otros', description: 'Integraciones adicionales', icon: '🔌' }
]
