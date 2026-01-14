import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { registerBillableEvent } from '@/modules/core/revenue/actions'
import type { BillableEventType } from '@/types/revenue'

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
// Maneja eventos de Stripe para registrar billable events
// TODO: Verificar firma del webhook con Stripe SDK

export async function POST(request: NextRequest) {
    const body = await request.text()

    // TODO: Verificar firma
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const sig = request.headers.get('stripe-signature')!
    // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    let event: any
    try {
        event = JSON.parse(body)
    } catch (err) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const supabase = await createClient()

    try {
        switch (event.type) {
            // ============================================
            // PAYMENT SUCCESS EVENTS
            // ============================================
            case 'checkout.session.completed': {
                // Nueva suscripción o compra
                const session = event.data.object
                const orgId = session.metadata?.organization_id
                const eventType = (session.metadata?.event_type || 'subscription_base') as BillableEventType

                if (!orgId) {
                    console.warn('Checkout session without organization_id metadata')
                    break
                }

                await registerBillableEvent({
                    organization_id: orgId,
                    event_type: eventType,
                    amount: session.amount_total / 100, // Stripe usa centavos
                    description: session.metadata?.description || 'Pago via Stripe Checkout',
                    stripe_payment_intent_id: session.payment_intent
                })
                break
            }

            case 'invoice.paid': {
                // Pago de factura (suscripción recurrente)
                const invoice = event.data.object
                const orgId = invoice.metadata?.organization_id ||
                    invoice.subscription_details?.metadata?.organization_id

                if (!orgId) {
                    console.warn('Invoice without organization_id metadata')
                    break
                }

                // Determinar tipo basado en líneas de la factura
                let eventType: BillableEventType = 'subscription_base'
                if (invoice.lines?.data?.some((l: any) => l.metadata?.is_addon)) {
                    eventType = 'subscription_addon'
                }

                await registerBillableEvent({
                    organization_id: orgId,
                    event_type: eventType,
                    amount: invoice.amount_paid / 100,
                    description: `Factura ${invoice.number}`,
                    invoice_id: invoice.id,
                    stripe_payment_intent_id: invoice.payment_intent
                })
                break
            }

            case 'payment_intent.succeeded': {
                // Pago único exitoso (one_time, add-on individual)
                const paymentIntent = event.data.object
                const orgId = paymentIntent.metadata?.organization_id
                const eventType = (paymentIntent.metadata?.event_type || 'one_time') as BillableEventType

                // Solo procesar si tiene metadata de organización
                // (evita duplicar eventos que ya vienen por invoice.paid)
                if (!orgId || paymentIntent.invoice) {
                    break
                }

                await registerBillableEvent({
                    organization_id: orgId,
                    event_type: eventType,
                    amount: paymentIntent.amount / 100,
                    description: paymentIntent.description || paymentIntent.metadata?.description,
                    stripe_payment_intent_id: paymentIntent.id
                })
                break
            }

            // ============================================
            // USAGE/METERING EVENTS
            // ============================================
            case 'invoice.finalized': {
                // Factura con overages lista
                const invoice = event.data.object
                const orgId = invoice.metadata?.organization_id

                // Buscar líneas de overage
                const overageLines = invoice.lines?.data?.filter((l: any) =>
                    l.metadata?.is_overage || l.price?.recurring?.usage_type === 'metered'
                ) || []

                for (const line of overageLines) {
                    if (!orgId) continue

                    await registerBillableEvent({
                        organization_id: orgId,
                        event_type: 'overage',
                        amount: line.amount / 100,
                        description: line.description || 'Excedente de uso',
                        invoice_id: invoice.id
                    })
                }
                break
            }

            // ============================================
            // CONNECT ACCOUNT EVENTS
            // ============================================
            case 'account.updated': {
                // Estado de cuenta Connect actualizado
                const account = event.data.object

                await supabase
                    .from('payment_accounts')
                    .update({
                        charges_enabled: account.charges_enabled,
                        payouts_enabled: account.payouts_enabled,
                        onboarding_complete: account.details_submitted,
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_account_id', account.id)
                break
            }

            case 'payout.paid': {
                // Payout completado
                const payout = event.data.object
                console.log(`Payout ${payout.id} completed to account ${payout.destination}`)
                break
            }

            case 'payout.failed': {
                // Payout fallido
                const payout = event.data.object
                console.error(`Payout ${payout.id} failed:`, payout.failure_message)

                // Actualizar settlement si existe
                await supabase
                    .from('settlements')
                    .update({ status: 'failed' })
                    .eq('stripe_payout_id', payout.id)
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook processing error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
