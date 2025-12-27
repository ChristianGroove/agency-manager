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
        const { error } = await supabase.auth.getUser()
        if (error) {
            console.error("Middleware getUser error:", error)
            // We do NOT clear cookies here; let the client handle auth failure naturally
            // Clearing cookies in middleware can cause looped logouts if the issue is transient
        }
    } catch (e) {
        console.error("Middleware unexpected error:", e)
    }

    return response
}
