import { afterEach, describe, expect, it, vi } from 'vitest'
import { helpV2Enabled, helpCorpus } from './runtime'
vi.mock('server-only', () => ({}))
vi.mock('./published.json', () => ({ default: { schema_version: 1, revision: 'unreviewed', articles: [{ status: 'draft' }] } }))
afterEach(() => vi.unstubAllEnvs())
describe('controlled help pilot', () => {
    it('requires both a master switch and tenant targeting', () => {
        vi.stubEnv('PIXY_HELP_V2_ENABLED', 'true'); vi.stubEnv('PIXY_HELP_V2_TENANTS', '')
        expect(helpV2Enabled('org-a')).toBe(false)
        vi.stubEnv('PIXY_HELP_V2_TENANTS', 'org-a')
        expect(helpV2Enabled('org-a')).toBe(true); expect(helpV2Enabled('org-b')).toBe(false)
        vi.stubEnv('PIXY_HELP_V2_ENABLED', 'false')
        expect(helpV2Enabled('org-a')).toBe(false)
    })
    it('fails closed when the build artifact contains an invalid draft', () => {
        expect(helpCorpus.revision).toBe('unavailable')
        expect(helpCorpus.articles).toEqual([])
    })
})
