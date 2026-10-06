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
    status: 'active' | 'disconnected' | 'error' | 'expired' | 'connecting' | 'deleted' | 'action_required' | 'temporarily_offboarded'
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

export const BUILTIN_PROVIDERS: IntegrationProvider[] = [
    {
        id: 'bitbucket-provider-default',
        key: 'bitbucket',
        name: 'Bitbucket',
        description: 'Sincronización nativa de ramas, commits y pull requests con Pixy Tasks',
        category: 'productivity',
        icon_url: '/icons/bitbucket.svg',
        is_premium: false,
        is_enabled: true,
        created_at: '2026-09-30T00:00:00Z',
        updated_at: '2026-09-30T00:00:00Z',
        documentation_url: 'https://support.atlassian.com/bitbucket-cloud/',
        setup_instructions: 'Ingresa el slug de tu Workspace y un Access Token de Bitbucket con permisos de lectura.',
        config_schema: {
            required: ['workspace', 'token'],
            properties: {
                workspace: {
                    type: 'string',
                    title: 'Bitbucket Workspace Slug',
                    description: 'Slug del workspace en Bitbucket (ej: mi-agencia)'
                },
                token: {
                    type: 'string',
                    title: 'Workspace Access Token',
                    description: 'Token con permisos de lectura de repositorios, webhooks y pull requests',
                    format: 'password'
                },
                webhook_secret: {
                    type: 'string',
                    title: 'Webhook Secret (Opcional)',
                    description: 'Clave secreta HMAC-SHA256 para validación criptográfica de webhooks',
                    format: 'password'
                }
            }
        }
    },
    {
        id: 'github-provider-default',
        key: 'github',
        name: 'GitHub',
        description: 'Sincronización nativa de ramas, commits y pull requests con Pixy Tasks',
        category: 'productivity',
        icon_url: '/icons/github.svg',
        is_premium: false,
        is_enabled: true,
        created_at: '2026-10-05T00:00:00Z',
        updated_at: '2026-10-05T00:00:00Z',
        documentation_url: 'https://docs.github.com/en/rest',
        setup_instructions: 'Ingresa un Personal Access Token (PAT) con permisos de repositorio y administración de webhooks.',
        config_schema: {
            required: ['token'],
            properties: {
                token: {
                    type: 'string',
                    title: 'Personal Access Token',
                    description: 'Token clásico con scopes repo y admin:org_hook, o Fine-grained token',
                    format: 'password'
                },
                owner: {
                    type: 'string',
                    title: 'Owner / Organización (Opcional)',
                    description: 'Usuario u organización de GitHub por defecto (ej: mi-agencia)'
                },
                webhook_secret: {
                    type: 'string',
                    title: 'Webhook Secret (Opcional)',
                    description: 'Clave secreta HMAC-SHA256 para validación criptográfica de webhooks',
                    format: 'password'
                }
            }
        }
    }
]
