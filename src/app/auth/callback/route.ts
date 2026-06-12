import { createClient } from "@/modules/core/database/supabase-server"
import { NextResponse } from "next/server"

const PUBLIC_AUTH_EXCHANGE_ERROR = 'Authentication could not be completed'
const PUBLIC_PROVIDER_AUTH_ERROR = 'Authentication provider rejected the request'
const PUBLIC_NO_CODE_ERROR = 'No code provided in callback'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function isSafeAuthParam(value: string | null | undefined): value is string {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)
}

function publicAuthDescription(value: string | null | undefined, fallback: string) {
    if (isDeployedRuntime()) return fallback
    return value || fallback
}

function publicAuthCode(value: string | null | undefined) {
    return isSafeAuthParam(value) ? value : ''
}

function publicAuthError(value: string | null | undefined, fallback = 'AuthError') {
    return isSafeAuthParam(value) ? value : fallback
}

function summarizeAuthCallbackError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            name: (error as any).name,
            code: publicAuthCode((error as any).code),
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logAuthCallbackError(label: string, ...details: unknown[]) {
    if (!isDeployedRuntime()) {
        console.error(label, ...details)
        return
    }

    console.error(label, details.map(summarizeAuthCallbackError))
}

function authErrorRedirect(origin: string, params: { error: string; errorDescription: string; errorCode?: string }) {
    const redirectUrl = new URL('/auth/auth-code-error', origin)
    redirectUrl.searchParams.set('error', params.error)
    redirectUrl.searchParams.set('error_description', params.errorDescription)
    if (params.errorCode) redirectUrl.searchParams.set('error_code', params.errorCode)

    return NextResponse.redirect(redirectUrl)
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const error_code = searchParams.get('error_code')

    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/platform'

    if (code) {
        const supabase = await createClient()
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

        if (!sessionError) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            logAuthCallbackError('Auth Code Exchange Error:', sessionError)
            return authErrorRedirect(origin, {
                error: publicAuthError(sessionError.name || 'AuthError'),
                errorCode: publicAuthCode(sessionError.code),
                errorDescription: publicAuthDescription(sessionError.message, PUBLIC_AUTH_EXCHANGE_ERROR),
            })
        }
    }

    // Check for explicit error from Supabase
    if (error) {
        logAuthCallbackError('Auth Callback Error:', { error, error_description, error_code })
        return authErrorRedirect(origin, {
            error: publicAuthError(error, 'ProviderAuthError'),
            errorCode: publicAuthCode(error_code),
            errorDescription: publicAuthDescription(error_description, PUBLIC_PROVIDER_AUTH_ERROR),
        })
    }

    // Fallback: No code and no error
    console.error('No code found in callback URL')
    return authErrorRedirect(origin, {
        error: 'NoCode',
        errorDescription: PUBLIC_NO_CODE_ERROR,
    })

    // This should not be reached if handled above, but as a fallback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
