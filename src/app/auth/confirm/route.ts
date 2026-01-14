import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

/**
 * Email Confirmation Endpoint
 * 
 * Supabase sends email confirmation links with either:
 * 1. `token_hash` + `type` (for magic links and email confirmations)
 * 2. `code` (for PKCE flow)
 * 
 * This endpoint handles the token_hash flow which doesn't require
 * the PKCE code_verifier stored in cookies, making it work across
 * different browsers/devices.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)

    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'signup' | 'recovery' | 'email' | 'invite' | null
    const next = searchParams.get('next') ?? '/onboarding'

    // If we have token_hash, use verifyOtp
    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Successful verification
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Token verification error:', error)
            return NextResponse.redirect(
                `${origin}/auth/auth-code-error?error=${encodeURIComponent(error.name || 'AuthError')}&error_code=${encodeURIComponent(error.code || '')}&error_description=${encodeURIComponent(error.message)}`
            )
        }
    }

    // Fallback: Check for code parameter (PKCE flow)
    const code = searchParams.get('code')
    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth code exchange error:', error)
            return NextResponse.redirect(
                `${origin}/auth/auth-code-error?error=${encodeURIComponent(error.name || 'AuthError')}&error_code=${encodeURIComponent(error.code || 'pkce_code_verifier_not_found')}&error_description=${encodeURIComponent(error.message)}`
            )
        }
    }

    // No valid parameters
    return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=InvalidRequest&error_description=Missing+token_hash+or+code+parameter`
    )
}
