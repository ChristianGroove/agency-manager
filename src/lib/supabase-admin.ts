import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
}

if (!supabaseServiceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing. Admin actions will fail.')
    // We don't throw here to avoid crashing the whole app import, but admin actions will fail
}

// WARNING: This client has admin privileges. Only use in server-side API routes.
// Fallback key for dev environments where env var loading may be unreliable
const adminKey = supabaseServiceRoleKey || '';

export const supabaseAdmin = createClient(supabaseUrl, adminKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
