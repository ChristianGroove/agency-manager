import { NextRequest, NextResponse } from 'next/server'
import { issueMetaOAuthSession } from '@/modules/infrastructure/meta/services/oauth-session'
export async function POST(request: NextRequest) {
    try {
        const requestOrigin = request.headers.get('origin')
        const allowedOrigins = new Set([new URL(request.url).origin])
        if (process.env.NEXT_PUBLIC_APP_URL) {
            allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin)
        }
        if (!requestOrigin || !allowedOrigins.has(requestOrigin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const { orgId } = await request.json()
        if (typeof orgId !== 'string') return NextResponse.json({ error: 'Invalid organization' }, { status: 400 })
        return NextResponse.json({ state: await issueMetaOAuthSession(orgId, { flow: 'embedded' }) })
    } catch { return NextResponse.json({ error: 'Could not start authorization' }, { status: 403 }) }
}
