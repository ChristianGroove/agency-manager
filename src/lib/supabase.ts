import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // CRITICAL: Disable multi-tab sync to prevent session bleeding between windows
        // This stops BroadcastChannel from syncing auth state across tabs/windows
        // @ts-ignore - multiTab is a valid option but may not be in older type definitions
        multiTab: false,
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
    }
})


