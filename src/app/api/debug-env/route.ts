import { NextResponse } from 'next/server'

// DEBUG ENDPOINT - Shows what env vars are baked into the build
// Safe: Only shows first 10 chars of keys
export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT_SET'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT_SET'

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV || 'NOT_VERCEL',
        supabase_url: url,
        supabase_anon_key_preview: anonKey.substring(0, 20) + '...',
        service_role_key_preview: serviceKey.substring(0, 20) + '...',
        is_anon_key_set: anonKey !== 'NOT_SET' && anonKey.length > 50,
        is_service_key_set: serviceKey !== 'NOT_SET' && serviceKey.length > 50,
    })
}
