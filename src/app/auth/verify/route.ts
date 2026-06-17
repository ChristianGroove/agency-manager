
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/modules/core/database/supabase-server'

const DEFAULT_VERIFY_REDIRECT = '/dashboard'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeAuthVerifyError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            name: (error as any).name,
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logAuthVerifyError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAuthVerifyError(error))
}

function safeVerifyRedirect(next: string | null, requestUrl: string) {
    const requestOrigin = new URL(requestUrl).origin

    try {
        const redirectUrl = new URL(next || DEFAULT_VERIFY_REDIRECT, requestOrigin)
        if (redirectUrl.origin !== requestOrigin) {
            return new URL(DEFAULT_VERIFY_REDIRECT, requestOrigin)
        }

        return redirectUrl
    } catch {
        return new URL(DEFAULT_VERIFY_REDIRECT, requestOrigin)
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? DEFAULT_VERIFY_REDIRECT

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            return NextResponse.redirect(safeVerifyRedirect(next, request.url))
        } else {
            logAuthVerifyError('Verify OTP Error:', error)
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
