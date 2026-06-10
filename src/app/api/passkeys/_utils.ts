import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/modules/core/security/rate-limit'

export const PASSKEY_LOGIN_UNAVAILABLE = 'Passkey login unavailable'

const PASSKEY_PUBLIC_RATE_LIMIT = {
    intervalMs: 60 * 1000,
    maxTokens: 30,
}

export function normalizePasskeyEmail(value: unknown) {
    return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function requirePasskeyPublicRateLimit(request: Request) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp = request.headers.get('x-real-ip')?.trim()
    const identifier = forwardedFor || realIp || 'anonymous'

    const { success } = checkRateLimit(`passkey:${identifier}`, PASSKEY_PUBLIC_RATE_LIMIT)
    return success
        ? null
        : NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}

export function passkeyLoginUnavailableResponse() {
    return NextResponse.json(
        { error: PASSKEY_LOGIN_UNAVAILABLE },
        { status: 404 }
    )
}
