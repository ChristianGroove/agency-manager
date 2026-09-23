import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMetaOAuthState, parseMetaOAuthState } from './oauth-state'
describe('Meta OAuth state integrity', () => {
    beforeEach(() => { vi.stubEnv('META_OAUTH_STATE_SECRET','unit-test-secret'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-21T00:00:00Z')) })
    afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
    it('accepts a fresh signed state', () => { expect(parseMetaOAuthState(createMetaOAuthState({ orgId:'org' })).ok).toBe(true) })
    it('rejects the former unsigned tenant injection', () => { expect(parseMetaOAuthState(Buffer.from(JSON.stringify({orgId:'victim'})).toString('base64')).ok).toBe(false) })
    it('rejects a modified tenant', () => {
        const state = createMetaOAuthState({orgId:'owner'}); const [body, signature] = state.split('.');
        const data = JSON.parse(Buffer.from(body,'base64url').toString()); data.orgId='victim';
        expect(parseMetaOAuthState(Buffer.from(JSON.stringify(data)).toString('base64url')+'.'+signature).ok).toBe(false)
    })
    it('rejects expiry and future issuance', () => {
        const state=createMetaOAuthState({orgId:'org'}); vi.advanceTimersByTime(600001); expect(parseMetaOAuthState(state).ok).toBe(false)
        vi.setSystemTime(new Date('2026-09-20')); expect(parseMetaOAuthState(state).ok).toBe(false)
    })
    it('does not fall back to unsigned state without a secret', () => { vi.stubEnv('META_OAUTH_STATE_SECRET',''); vi.stubEnv('META_APP_SECRET',''); expect(() => createMetaOAuthState({})).toThrow() })
})
