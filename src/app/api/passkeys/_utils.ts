import { NextResponse } from 'next/server'

export const PASSKEY_LOGIN_UNAVAILABLE = 'Passkey login unavailable'

export function normalizePasskeyEmail(value: unknown) {
    return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function passkeyLoginUnavailableResponse() {
    return NextResponse.json(
        { error: PASSKEY_LOGIN_UNAVAILABLE },
        { status: 404 }
    )
}
