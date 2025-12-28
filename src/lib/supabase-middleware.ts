import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Fallback values matching src/lib/supabase-server.ts
const SUPABASE_URL = "https://amwlwmkejdjskukdfwut.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDg2OTUsImV4cCI6MjA4MTQyNDY5NX0.X7zYfWR9J83sXnYCEfvB7u_tNTupHqd5GQC82gOO__E"

export async function updateSession(request: NextRequest, response: NextResponse) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        // SUSPENSION CHECK LOGIC
        if (user && !request.nextUrl.pathname.startsWith('/suspended') && !request.nextUrl.pathname.startsWith('/api/auth')) {
            // 1. Check if SUPER ADMIN (Bypass)
            const { data: profile } = await supabase
                .from('profiles')
                .select('platform_role')
                .eq('id', user.id)
                .single()

            if (profile?.platform_role !== 'super_admin') {
                // 2. Check Organization Status
                // We assume the user creates/belongs to an organization. 
                // If the main organization is suspended, block access.
                const { data: membership } = await supabase
                    .from('organization_users')
                    .select('organization:organizations!inner(status)')
                    .eq('user_id', user.id)
                    .maybeSingle() // Use maybeSingle to avoid infinite loops if no org found

                // @ts-ignore - Supabase types might be strict about joins
                const orgStatus = membership?.organization?.status

                if (orgStatus === 'suspended') {
                    // Block access!
                    const url = request.nextUrl.clone()
                    url.pathname = '/suspended'
                    return NextResponse.redirect(url)
                }
            }
        }

        if (error) {
            console.error("Middleware getUser error:", error)
            // We do NOT clear cookies here; let the client handle auth failure naturally
        }
    } catch (e) {
        console.error("Middleware unexpected error:", e)
    }

    return response
}
