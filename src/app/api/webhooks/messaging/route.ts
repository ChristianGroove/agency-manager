import { NextRequest, NextResponse } from 'next/server'
import { MessagingProvider, IncomingMessage, SendMessageOptions, WebhookValidationResult } from '@/modules/features/messaging/providers/types'
import { ChannelType } from '@/types/messaging'
import { MetaProvider } from '@/modules/features/messaging/providers/meta-provider'
import { EvolutionProvider } from '@/modules/features/messaging/providers/evolution-provider'

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

function logMessagingWebhookFailure(label: string, message: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, message)
        return
    }

    console.error(label, { hasMessage: typeof message === 'string' && message.length > 0 })
}

function logMessagingWebhookResult(result: { success?: boolean; message?: unknown }) {
    if (!isProductionRuntime()) {
        console.log('[Webhook POST] Result:', result)
        return
    }

    console.log('[Webhook POST] Result:', {
        success: result.success === true,
        hasMessage: typeof result.message === 'string' && result.message.length > 0,
    })
}

function messagingWebhookFailureMessage(message: unknown) {
    if (isProductionRuntime()) {
        return PUBLIC_MESSAGING_WEBHOOK_FAILURE
    }

    return typeof message === 'string' && message.length > 0
        ? message
        : PUBLIC_MESSAGING_WEBHOOK_FAILURE
}

// --- Loopback Strategy (Keep for loopback tests) ---
class LoopbackStrategy implements MessagingProvider {
    name = 'loopback'
    async sendMessage(options: SendMessageOptions) { console.log('[Loopback]', options); return { success: true, messageId: 'mock-id' } }
    async validateWebhook(request: Request) { return { isValid: true } }
    async parseWebhook(payload: unknown) { return [payload as IncomingMessage] }
}

// Helper to load and configure manager on demand
// This prevents top-level import crashes from blocking the Verification phase
async function getConfiguredManager() {
    console.log('[getConfiguredManager] Starting dynamic import...')
    let webhookManagerModule;
    try {
        webhookManagerModule = await import('@/modules/features/messaging/webhook-handler')
        console.log('[getConfiguredManager] Import successful')
    } catch (err: any) {
        logMessagingWebhookError('[getConfiguredManager] Import FAILED:', err)
        throw new Error(`Failed to import webhook-handler: ${err.message}`)
    }

    const { webhookManager } = webhookManagerModule

    // Config logic: Register providers if not already done
    try {
        // Register Email Loopback
        // FIX: Method name is registerProvider, not register
        webhookManager.registerProvider('email', new LoopbackStrategy())

        // Register Meta
        const metaProvider = new MetaProvider(
            process.env.META_API_TOKEN || '',
            process.env.META_PHONE_NUMBER_ID || '',
            process.env.META_WEBHOOK_VERIFY_TOKEN || 'pixy_webhook_2026'
        )
        webhookManager.registerProvider('whatsapp', metaProvider)
        webhookManager.registerProvider('messenger', metaProvider)
        webhookManager.registerProvider('instagram', metaProvider)

        // Register Evolution API (Unofficial WhatsApp)
        // Note: For sending, we need real credentials. For receiving webhook, dummy config suffices 
        // as we trust the endpoint hit (or use URL token verification if implemented).
        const evolutionProvider = new EvolutionProvider({
            baseUrl: "https://placeholder-inbound.com",
            apiKey: "placeholder",
            instanceName: "placeholder"
        })
        webhookManager.registerProvider('evolution', evolutionProvider)
    } catch (err: any) {
        logMessagingWebhookError('[getConfiguredManager] Registration FAILED:', err)
        throw new Error(`Failed to register providers: ${err.message}`)
    }

    return webhookManager
}

export async function GET(req: NextRequest) {
    try {
        console.log('[Webhook GET] Incoming Request URL:', req.url)
        const channel = req.nextUrl.searchParams.get('channel') as ChannelType || 'whatsapp'

        // --- 1. FAST VERIFICATION PATH (Recommended) ---
        // Bypasses heavy module loading for maximum reliability during Meta Handshake
        const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'pixy_webhook_2026'
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
        const body = JSON.parse(rawBody);
        let channel = req.nextUrl.searchParams.get('channel') as ChannelType;

        // Auto-detect Meta channels from payload if not in URL
        if (!channel && body.object) {
            if (body.object === 'instagram') channel = 'instagram';
            else if (body.object === 'page') channel = 'messenger';
            else if (body.object === 'whatsapp_business_account') channel = 'whatsapp';
        }
        
        // Final fallback
        if (!channel) channel = 'whatsapp';

        // Dynamically load manager to handle the heavy lifting
        console.log(`[Webhook POST] Loading webhook manager for detected channel: ${channel}...`)
        const manager = await getConfiguredManager()
        console.log('[Webhook POST] Manager loaded, processing...')

        const result = await manager.handleParsed(channel, body)
        logMessagingWebhookResult(result)

        if (!result.success) {
            logMessagingWebhookFailure('[Webhook POST] Failed:', result.message)
            return NextResponse.json({ error: messagingWebhookFailureMessage(result.message) }, { status: 401 })
        }

        console.log('[Webhook POST] ✅ Success')
        console.log('==========================================\n')
        return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
        logMessagingWebhookError('[Webhook POST] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
