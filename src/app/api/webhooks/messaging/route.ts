import { NextRequest, NextResponse } from 'next/server'
import { MessagingProvider, IncomingMessage, SendMessageOptions, WebhookValidationResult } from '@/modules/core/messaging/providers/types'
import { ChannelType } from '@/types/messaging'
import { MetaProvider } from '@/modules/core/messaging/providers/meta-provider'
import { EvolutionProvider } from '@/modules/core/messaging/providers/evolution-provider'

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
        webhookManagerModule = await import('@/modules/core/messaging/webhook-handler')
        console.log('[getConfiguredManager] Import successful')
    } catch (err: any) {
        console.error('[getConfiguredManager] Import FAILED:', err)
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
            'antigravity_verification_token_2026'
        )
        webhookManager.registerProvider('whatsapp', metaProvider)

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
        console.error('[getConfiguredManager] Registration FAILED:', err)
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
        if (req.nextUrl.searchParams.get('hub.mode') === 'subscribe' &&
            req.nextUrl.searchParams.get('hub.verify_token') === 'antigravity_verification_token_2026') {
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
        console.error('[Webhook GET] Error:', error)
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 })
    }
}

import * as fs from 'fs';
import * as path from 'path';

function fileLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] [ROUTE] ${msg}\n`);
    } catch (e) { }
}

export async function POST(req: NextRequest) {
    try {
        fileLog('\n========== WEBHOOK POST RECEIVED ==========')
        const channel = req.nextUrl.searchParams.get('channel') as ChannelType || 'whatsapp'
        fileLog(`Channel: ${channel}`)
        console.log('[Webhook POST] Channel:', channel)

        // Log the raw body
        const body = await req.json()
        fileLog(`Body: ${JSON.stringify(body)}`)
        console.log('[Webhook POST] Body:', JSON.stringify(body, null, 2))

        // Dynamically load manager to handle the heavy lifting
        console.log('[Webhook POST] Loading webhook manager...')
        const manager = await getConfiguredManager()
        console.log('[Webhook POST] Manager loaded, processing...')

        const result = await manager.handleParsed(channel, body)
        fileLog(`Result: ${JSON.stringify(result)}`)
        console.log('[Webhook POST] Result:', result)

        if (!result.success) {
            console.error('[Webhook POST] Failed:', result.message)
            return NextResponse.json({ error: result.message }, { status: 401 })
        }

        console.log('[Webhook POST] ✅ Success')
        console.log('==========================================\n')
        return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
        console.error('[Webhook POST] ❌ ERROR:', error)
        console.error('[Webhook POST] Stack:', error.stack)
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 })
    }
}
