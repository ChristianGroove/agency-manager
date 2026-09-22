import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const MAX_AGE_MS = 10 * 60 * 1000
function signingKey() {
    const key = process.env.META_OAUTH_STATE_SECRET || process.env.META_APP_SECRET
    if (!key) throw new Error('Meta OAuth signing secret is required')
    return key
}
export function createMetaOAuthState(data: Record<string, unknown>): string {
    const payload = Buffer.from(JSON.stringify({ ...data, issuedAt: Date.now(), nonce: randomBytes(32).toString('hex') })).toString('base64url')
    return payload + '.' + createHmac('sha256', signingKey()).update(payload).digest('base64url')
}
export function parseMetaOAuthState(state: string): { ok: true; state: Record<string, any> } | { ok: false; error: string } {
    try {
        if (state.length > 4096) throw new Error('Invalid state')
        const parts = state.split('.')
        if (parts.length !== 2) throw new Error('Invalid state')
        const [payload, signature] = parts
        const expected = createHmac('sha256', signingKey()).update(payload).digest()
        const actual = Buffer.from(signature, 'base64url')
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid state')
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
        const age = Date.now() - parsed.issuedAt
        if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS || typeof parsed.nonce !== 'string') throw new Error('Expired state')
        return { ok: true, state: parsed }
    } catch {
        return { ok: false, error: 'Invalid or expired Meta OAuth state' }
    }
}
