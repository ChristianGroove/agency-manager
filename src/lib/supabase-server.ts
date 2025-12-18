import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Fallback values from src/lib/supabase.ts if env vars are missing
const SUPABASE_URL = "https://amwlwmkejdjskukdfwut.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDg2OTUsImV4cCI6MjA4MTQyNDY5NX0.X7zYfWR9J83sXnYCEfvB7u_tNTupHqd5GQC82gOO__E"

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
