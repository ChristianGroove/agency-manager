import { NextRequest, NextResponse } from 'next/server'
import { issueMetaOAuthSession } from '@/modules/infrastructure/meta/services/oauth-session'
export async function POST(request: NextRequest) {
    try {
        if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const { orgId } = await request.json()
        if (typeof orgId !== 'string') return NextResponse.json({ error: 'Invalid organization' }, { status: 400 })
        return NextResponse.json({ state: await issueMetaOAuthSession(orgId, { flow: 'embedded' }) })
    } catch { return NextResponse.json({ error: 'Could not start authorization' }, { status: 403 }) }
}
