import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"

// Fallback values need to match server config
const SUPABASE_URL = "https://amwlwmkejdjskukdfwut.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDg2OTUsImV4cCI6MjA4MTQyNDY5NX0.X7zYfWR9J83sXnYCEfvB7u_tNTupHqd5GQC82gOO__E"

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") || "/dashboard"

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error("Auth Callback Error:", error)
            // Redirect to login with error explanation
            return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(`${origin}${next}`)
}
