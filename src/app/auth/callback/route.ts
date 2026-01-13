import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/platform'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth Code Exchange Error:', error)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.name || 'AuthError')}&error_code=${encodeURIComponent(error.code || '')}&error_description=${encodeURIComponent(error.message)}`)
        }
    } else {
        console.error('No code found in callback URL')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=NoCode&error_description=No+code+provided+in+callback`)
    }

    // This should not be reached if handled above, but as a fallback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
