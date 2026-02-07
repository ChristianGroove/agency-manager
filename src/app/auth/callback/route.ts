import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

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
            console.error('Auth Code Exchange Error:', sessionError)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(sessionError.name || 'AuthError')}&error_code=${encodeURIComponent(sessionError.code || '')}&error_description=${encodeURIComponent(sessionError.message)}`)
        }
    }

    // Check for explicit error from Supabase
    if (error) {
        console.error('Auth Callback Error:', error, error_description)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}&error_code=${encodeURIComponent(error_code || '')}`)
    }

    // Fallback: No code and no error
    console.error('No code found in callback URL')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=NoCode&error_description=No+code+provided+in+callback`)

    // This should not be reached if handled above, but as a fallback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
