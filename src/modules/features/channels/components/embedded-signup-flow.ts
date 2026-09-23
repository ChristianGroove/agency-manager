export type WhatsAppSignupMode = 'cloud' | 'coexistence'

export function buildEmbeddedSignupOptions(configId: string, mode: WhatsAppSignupMode) {
    return {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
        extras: {
            setup: {},
            version: 'v4',
            sessionInfoVersion: '3',
            ...(mode === 'coexistence' ? { featureType: 'whatsapp_business_app_onboarding' } : {}),
        },
    }
}

export function getCompletedSignupMode(event: string): WhatsAppSignupMode | null {
    if (event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') return 'coexistence'
    if (event === 'FINISH') return 'cloud'
    return null
}
