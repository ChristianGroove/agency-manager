import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { PRIVATE_CHAT_MEDIA_BUCKET } from '@/modules/features/messaging/constants'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params
    if (!path || path.length < 3 || !UUID.test(path[0]) || path.some(segment =>
        !SAFE_SEGMENT.test(segment) || segment === '.' || segment === '..')) {
        return NextResponse.json({ error: 'Invalid media path' }, { status: 400 })
    }

    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organizationId = path[0]
    const { data: member } = await supabaseAdmin.from('organization_members')
        .select('user_id').eq('organization_id', organizationId).eq('user_id', user.id)
        .is('deleted_at', null).maybeSingle()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: media, error } = await supabaseAdmin.storage.from(PRIVATE_CHAT_MEDIA_BUCKET)
        .download(path.join('/'))
    if (error || !media) return NextResponse.json({ error: 'Media unavailable' }, { status: 404 })

    return new NextResponse(await media.arrayBuffer(), {
        headers: {
            'Content-Type': media.type || 'application/octet-stream',
            'Cache-Control': 'private, no-store',
            'Content-Security-Policy': 'sandbox',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
