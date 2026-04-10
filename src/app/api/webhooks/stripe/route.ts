import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/modules/infrastructure/automation/inngest/client'

/**
 * Stripe Webhook Handler (Async Offloading)
 * 
 * Simply acknowledges the event from Stripe and dispatches it to Inngest
 * for reliable background processing.
 */
export async function POST(request: NextRequest) {
    const body = await request.text()

    // TODO: Verify signature in production
    // const sig = request.headers.get('stripe-signature')!
    
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
        console.error('[Webhook:Stripe] Error dispatching to Inngest:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
