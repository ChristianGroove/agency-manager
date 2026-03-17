import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // CRITICAL: Enable multi-tab sync to ensure consistent session state across windows
        // This uses BroadcastChannel to sync auth state across tabs/windows
        // @ts-ignore - multiTab is a valid option but may not be in older type definitions
        multiTab: true,
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
    }
})


