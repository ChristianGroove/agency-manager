import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { taskVcsService } from '@/modules/features/tasks/services/task-vcs-service'
import { resolveConnectionCredentials } from '@/modules/infrastructure/integrations/connection-secrets'
import { decryptObject } from '@/modules/infrastructure/integrations/encryption'

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ connectionId: string }> }
) {
    try {
        const { connectionId } = await props.params

        if (!connectionId) {
            return NextResponse.json({ error: 'Missing connectionId parameter' }, { status: 400 })
        }

        const rawBody = await request.text()
        const eventKey = request.headers.get('x-github-event') || request.headers.get('x-event-key') || 'unknown'

        // 1. O(1) Connection Lookup in database
        const { data: connection, error: connError } = await supabaseAdmin
            .from('integration_connections')
            .select('id, organization_id, credentials, config, metadata, status')
            .eq('id', connectionId)
            .eq('status', 'active')
            .single()

        if (connError || !connection) {
            return NextResponse.json({ error: 'Connection not found or inactive' }, { status: 404 })
        }

        // 2. Resolve credentials to extract webhook secret
        let credentials: Record<string, any> = {}
        try {
            credentials = await resolveConnectionCredentials(connection.credentials)
        } catch {
            credentials = decryptObject(connection.credentials) || {}
        }

        const webhookSecret = credentials.webhook_secret || credentials.secret || connection.config?.webhook_secret || connection.metadata?.webhook_secret

        if (!webhookSecret) {
            return NextResponse.json({ error: 'Webhook secret not configured on connection' }, { status: 500 })
        }

        // 3. HMAC-SHA256 Constant-Time Verification
        const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('X-Hub-Signature-256')
        if (!signatureHeader) {
            return NextResponse.json({ error: 'Missing HMAC signature header (x-hub-signature-256)' }, { status: 401 })
        }

        const trimmedSig = signatureHeader.trim()
        const cleanSig = trimmedSig.replace(/^sha256=/i, '')
        if (cleanSig.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(cleanSig)) {
            return NextResponse.json({ error: 'Invalid HMAC signature format' }, { status: 401 })
        }

        const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

        const sigBuf = Buffer.from(cleanSig, 'hex')
        const expBuf = Buffer.from(expectedSig, 'hex')

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
        }

        // 4. Ping Handshake Response for GitHub Webhook ping events (executed AFTER connection lookup & HMAC verification)
        if (eventKey === 'ping') {
            let pingPayload: Record<string, any> = {}
            try {
                pingPayload = JSON.parse(rawBody)
            } catch {
                // Ignore malformed ping JSON
            }
            return NextResponse.json({
                ok: true,
                zen: pingPayload?.zen || 'pong'
            }, { status: 200 })
        }

        // 5. Parse JSON payload
        let payload: Record<string, any>
        try {
            payload = JSON.parse(rawBody)
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        // 6. Direct synchronous execution of VCS event logic (idempotent, immediate transition and audit logging)
        const result = await taskVcsService.processGithubEvent({
            provider: 'github',
            eventKey,
            connectionId: connection.id,
            organizationId: connection.organization_id,
            payload
        })

        return NextResponse.json({
            received: true,
            event: eventKey,
            result
        }, { status: 200 })
    } catch (err: any) {
        console.error('[Webhook:GitHub] Error processing incoming webhook:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
