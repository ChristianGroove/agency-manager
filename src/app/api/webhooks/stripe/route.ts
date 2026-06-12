import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { isProductionRuntime, requireStripeWebhookSignature } from '@/app/api/_guards/request-guards'

function logStripeWebhookError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

/**
 * Stripe Webhook Handler (Async Offloading)
 * 
 * Simply acknowledges the event from Stripe and dispatches it to Inngest
 * for reliable background processing.
 */
export async function POST(request: NextRequest) {
    const body = await request.text()

    const signatureError = requireStripeWebhookSignature(request, body)
    if (signatureError) return signatureError
    
    let event: any
    try {
        event = JSON.parse(body)
    } catch (err) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    try {
        // Dispatch to Inngest
        await inngest.send({
            name: 'stripe/webhook.received',
            data: { event }
        })

        console.log(`[Webhook:Stripe] Event ${event.type} dispatched to Inngest.`)
        
        return NextResponse.json({ received: true, async: true })
    } catch (error: any) {
        logStripeWebhookError('[Webhook:Stripe] Error dispatching to Inngest:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
