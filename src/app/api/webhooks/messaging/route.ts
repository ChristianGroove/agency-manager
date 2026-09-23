import { NextRequest, NextResponse } from 'next/server'
import { isProductionRuntime, requireMetaWebhookSignature } from '@/app/api/_guards/request-guards'

const PUBLIC_MESSAGING_WEBHOOK_FAILURE = 'Webhook processing failed'

function logMessagingWebhookError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

export async function GET(req: NextRequest) {
    try {

        // --- 1. FAST VERIFICATION PATH (Recommended) ---
        // Bypasses heavy module loading for maximum reliability during Meta Handshake
        const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN
        if (!VERIFY_TOKEN) return new NextResponse('Webhook configuration unavailable', { status: 503 })
        if (req.nextUrl.searchParams.get('hub.mode') === 'subscribe' &&
            req.nextUrl.searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
            const challenge = req.nextUrl.searchParams.get('hub.challenge')
            console.log('[Webhook GET] Fast Verify Success')
            return new NextResponse(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            })
        }
        // -----------------------------------------------------------

        return new NextResponse('Validation failed', { status: 403 })
    } catch (error: any) {
        logMessagingWebhookError('[Webhook GET] Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const rejected = requireMetaWebhookSignature(req, rawBody);
        if (rejected) return rejected;
        const body = JSON.parse(rawBody);
        const channel = body.object === 'whatsapp_business_account' ? 'whatsapp' : body.object === 'page' ? 'messenger' : body.object === 'instagram' ? 'instagram' : null;
        if (!channel || !Array.isArray(body.entry)) return NextResponse.json({ error: 'Unsupported webhook object' }, { status: 400 });
        const { createHash } = await import('crypto');
        const { supabaseAdmin } = await import('@/modules/core/database/supabase-admin');
        const { inngest } = await import('@/modules/infrastructure/automation/inngest/client');
        const id = createHash('sha256').update(rawBody).digest('hex');
        const saved = await supabaseAdmin.from('meta_webhook_events').upsert({ id, payload: body, channel }, { onConflict: 'id', ignoreDuplicates: true });
        if (saved.error) throw new Error('Webhook persistence unavailable');
        await inngest.send({ id: 'meta-' + id, name: 'meta/webhook.received', data: { eventId: id } });
        console.log('[Webhook POST] ✅ Success')
        return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
        logMessagingWebhookError('[Webhook POST] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
