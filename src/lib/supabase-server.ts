import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ⚠️ Environment variables are strictly enforced. NO HARDCODED FALLBACKS to prevent Production leaks.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: Supabase environment variables are missing.')
}

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name: string) {
                    const value = cookieStore.get(name)?.value;
                    if (name.includes('verifier')) console.log(`[AUTH] GET Cookie ${name}: ${value ? 'FOUND' : 'MISSING'}`);
                    return value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        if (name.includes('verifier')) console.log(`[AUTH] SET Cookie ${name}`);
                        // Force secure: false on localhost to prevent PKCE errors
                        const secure = SUPABASE_URL.includes('localhost') ? false : options.secure;
                        cookieStore.set({ name, value, ...options, secure })
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
