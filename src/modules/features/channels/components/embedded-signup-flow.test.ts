import { describe, expect, it } from 'vitest'
import { buildEmbeddedSignupOptions, getCompletedSignupMode } from './embedded-signup-flow'

describe('WhatsApp Embedded Signup mode', () => {
    it('opens ordinary Cloud API without the Business App onboarding feature', () => {
        const options = buildEmbeddedSignupOptions('config', 'cloud')
        expect(options.extras).toHaveProperty('version', 'v4')
        expect(options.extras).not.toHaveProperty('featureType')
        expect(options.config_id).toBe('config')
        expect(getCompletedSignupMode('FINISH')).toBe('cloud')
    })

    it('opens coexistence explicitly and recognizes only its completion event', () => {
        const options = buildEmbeddedSignupOptions('config', 'coexistence')
        expect(options.extras).toHaveProperty('version', 'v4')
        expect(options.extras).toHaveProperty('featureType', 'whatsapp_business_app_onboarding')
        expect(getCompletedSignupMode('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING')).toBe('coexistence')
        expect(getCompletedSignupMode('CANCEL')).toBeNull()
    })
})
