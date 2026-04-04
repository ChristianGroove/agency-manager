import { inngest } from "@/lib/inngest/client"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { registerBillableEvent } from "@/modules/core/revenue/actions"
import type { BillableEventType } from "@/types/revenue"

/**
 * Handle Stripe Webhook events asynchronously
 */
export const processStripeWebhook = inngest.createFunction(
    { 
        id: "process-stripe-webhook", 
        name: "Process Stripe Webhook",
        retries: 3
    },
    { event: "stripe/webhook.received" },
    async ({ event, step }) => {
        const stripeEvent = event.data.event

        await step.run("database-processing", async () => {
            switch (stripeEvent.type) {
                case 'checkout.session.completed': {
                    const session = stripeEvent.data.object
                    const orgId = session.metadata?.organization_id
                    const eventType = (session.metadata?.event_type || 'subscription_base') as BillableEventType

                    if (!orgId) break

                    await registerBillableEvent({
                        organization_id: orgId,
                        event_type: eventType,
                        amount: session.amount_total / 100,
                        description: session.metadata?.description || 'Pago via Stripe Checkout',
                        stripe_payment_intent_id: session.payment_intent
                    })
                    break
                }

                case 'invoice.paid': {
                    const invoice = stripeEvent.data.object
                    const orgId = invoice.metadata?.organization_id ||
                        invoice.subscription_details?.metadata?.organization_id

                    if (!orgId) break

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
                    const paymentIntent = stripeEvent.data.object
                    const orgId = paymentIntent.metadata?.organization_id
                    const eventType = (paymentIntent.metadata?.event_type || 'one_time') as BillableEventType

                    if (!orgId || paymentIntent.invoice) break

                    await registerBillableEvent({
                        organization_id: orgId,
                        event_type: eventType,
                        amount: paymentIntent.amount / 100,
                        description: paymentIntent.description || paymentIntent.metadata?.description,
                        stripe_payment_intent_id: paymentIntent.id
                    })
                    break
                }

                case 'account.updated': {
                    const account = stripeEvent.data.object
                    await supabaseAdmin
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

                case 'payout.failed': {
                    const payout = stripeEvent.data.object
                    await supabaseAdmin
                        .from('settlements')
                        .update({ status: 'failed' })
                        .eq('stripe_payout_id', payout.id)
                    break
                }
            }
            return { processed: true }
        })

        return { success: true }
    }
)
