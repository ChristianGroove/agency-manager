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
        const eventKey = request.headers.get('x-event-key') || 'unknown'

        // 1. O(1) Connection Lookup in database
        const { data: connection, error: connError } = await supabaseAdmin
            .from('integration_connections')
            .select('id, organization_id, credentials, config, metadata, status')
            .eq('id', connectionId)
            .neq('status', 'deleted')
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

        // 3. HMAC-SHA256 Constant-Time Verification
        if (webhookSecret) {
            const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature') || request.headers.get('X-Hub-Signature')
            if (!signatureHeader) {
                return NextResponse.json({ error: 'Missing HMAC signature header (X-Hub-Signature-256 or X-Hub-Signature)' }, { status: 401 })
            }

            const cleanSig = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader
            if (cleanSig.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(cleanSig)) {
                return NextResponse.json({ error: 'Invalid HMAC signature format' }, { status: 401 })
            }

            const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

            const sigBuf = Buffer.from(cleanSig, 'hex')
            const expBuf = Buffer.from(expectedSig, 'hex')

            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
                return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
            }
        }

        // 4. Parse JSON payload
        let payload: Record<string, any>
        try {
            payload = JSON.parse(rawBody)
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        // 5. Direct execution of VCS event logic (idempotent, immediate transition and audit logging)
        const result = await taskVcsService.processBitbucketEvent({
            provider: 'bitbucket',
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
        console.error('[Webhook:Bitbucket] Error processing incoming webhook:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
