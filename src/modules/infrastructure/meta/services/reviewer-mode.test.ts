import { afterEach, describe, expect, it, vi } from 'vitest'

describe('ReviewerModeManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it('does not provide a hardcoded reviewer password by default', async () => {
        const { ReviewerModeManager } = await import('./reviewer-mode')

        const credentials = new ReviewerModeManager().getReviewerCredentials()

        expect(credentials.email).toBe('meta_reviewer@pixy.test')
        expect(credentials.password).toBe('')
    })

    it('uses an explicit server-side reviewer password when configured', async () => {
        vi.stubEnv('META_REVIEWER_PASSWORD', 'configured-reviewer-secret')
        const { ReviewerModeManager } = await import('./reviewer-mode')

        const credentials = new ReviewerModeManager().getReviewerCredentials()

        expect(credentials.password).toBe('configured-reviewer-secret')
    })
})
