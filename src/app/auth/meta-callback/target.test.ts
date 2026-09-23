import { describe, expect, it } from 'vitest'
import { buildMetaCallbackTarget } from './target'

describe('Meta OAuth final navigation', () => {
    it('preserves the asset-selection step after a multi-asset authorization', () => {
        expect(buildMetaCallbackTarget('/platform/integrations', {
            success: 'meta_connected', action: 'configure_assets',
        })).toBe('/platform/integrations?success=meta_connected&action=configure_assets')
    })

    it('rejects external redirect targets', () => {
        expect(buildMetaCallbackTarget('//outside.example', { error: 'invalid_state' }))
            .toBe('/platform/integrations?error=invalid_state')
    })
})
