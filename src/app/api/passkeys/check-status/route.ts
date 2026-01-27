
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = body.email

        if (!email) {
            return NextResponse.json({ hasPasskeys: false }, { status: 200 })
        }

        // 1. Find user by email using Admin Client (auth.users is protected)
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()

        // Note: listUsers isn't efficient for high scale but works for specific lookups if we filter poorly.
        // Better approach for scale: supabaseAdmin.rpc('get_user_id_by_email', { email }) if available.
        // For now, let's try to map strictly. 
        // Actually, supabaseAdmin.auth.admin.listUsers() doesn't filter by email directly in current JS SDK types sometimes.
        // Let's rely on mapping. 

        // OPTIMIZATION: If we have a public profiles table, use that.
        // But for auth security, let's stick to admin lookup for correctness.

        if (userError || !userData.users) {
            console.error('Error listing users:', userError)
            return NextResponse.json({ hasPasskeys: false })
        }

        const user = userData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (!user) {
            return NextResponse.json({ hasPasskeys: false })
        }

        // 2. Check if user has passkeys
        const { count, error: countError } = await supabaseAdmin
            .from('user_passkeys')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (countError) {
            console.error('Error checking passkeys:', countError)
            return NextResponse.json({ hasPasskeys: false })
        }

        return NextResponse.json({
            hasPasskeys: (count || 0) > 0
        })

    } catch (error) {
        console.error('Check status error:', error)
        return NextResponse.json({ hasPasskeys: false }, { status: 500 })
    }
}
