import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { logDomainEvent } from "@/modules/infrastructure/logging/services/event-logger"
import { isProductionRuntime } from '@/app/api/_guards/request-guards'
import { createClient } from "@/modules/core/database/supabase-server";

function sanitizeWompiWebhookLogDetails(details: Record<string, unknown>) {
    const sensitiveKeys = new Set([
        'clientId',
        'invoiceId',
        'invoiceIds',
        'invoiceNumber',
        'organizationId',
        'paymentTransactionId',
        'platformInvoiceId',
        'processId',
        'reference',
        'subscriptionId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeWompiWebhookError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error }
}

function logWompiWebhookInfo(label: string, details?: Record<string, unknown>) {
    if (!details) {
        console.log(label)
        return
    }

    if (!isProductionRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeWompiWebhookLogDetails(details))
}

function logWompiWebhookError(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isProductionRuntime()) {
        if (details) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...(details ? sanitizeWompiWebhookLogDetails(details) : {}),
        detail: summarizeWompiWebhookError(error),
    })
}

function safeEqual(a: string, b: string) {
    const aBuffer = Buffer.from(a)
    const bBuffer = Buffer.from(b)

    if (aBuffer.length !== bBuffer.length) {
        return false
    }

    return timingSafeEqual(aBuffer, bBuffer)
}

export async function GET() {
    return NextResponse.json({
        status: 'active',
        message: 'Wompi Webhook Endpoint is reachable',
        time: new Date().toISOString()
    }, { status: 200 })
}

async function updateWompiSyncStatus(organizationId: string, environment: string) {
    const { error } = await (await createClient())
        .from('organization_settings')
        .update({
            wompi_last_sync: new Date().toISOString(),
            wompi_environment: environment
        })
        .eq('organization_id', organizationId)

    if (error) {
        logWompiWebhookError('Error updating Wompi settings:', error)
    }
}

export async function POST(request: Request) {
    logWompiWebhookInfo('[WompiWebhook] Hit', { receivedAt: new Date().toISOString() })

    try {
        let body: any
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
        }

        const { data, signature, timestamp, environment } = body

        // Wompi sends the transaction data inside 'data.transaction'
        const transaction = data?.transaction

        if (!transaction) {
            logWompiWebhookInfo('[WompiWebhook] No transaction data found in body')
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
        }

        if (!signature?.checksum || !timestamp) {
            return NextResponse.json({ error: 'Invalid webhook signature payload' }, { status: 400 })
        }

        const eventsSecret = process.env.WOMPI_EVENTS_SECRET

        if (!eventsSecret) {
            console.error('WOMPI_EVENTS_SECRET not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Validate Signature
        // Formula: SHA256(transaction.id + transaction.status + transaction.amount_in_cents + timestamp + eventsSecret)
        const signatureString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${eventsSecret}`
        const calculatedSignature = createHash('sha256').update(signatureString).digest('hex')

        if (!safeEqual(calculatedSignature, signature.checksum)) {
            console.error('Invalid Wompi webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        logWompiWebhookInfo('[WompiWebhook] Signature valid')

        // Process Payment
        if (transaction.status === 'APPROVED') {
            const reference = transaction.reference
            logWompiWebhookInfo('[WompiWebhook] Processing approved payment', { reference })

            if (reference.startsWith('PAY-')) {
                logWompiWebhookInfo('[WompiWebhook] Detected batch payment')
                // 1. Find the transaction record
                const { data: paymentTx, error: txError } = await (await createClient())
                    .from('payment_transactions')
                    .select('*')
                    .eq('reference', reference)
                    .single()

                if (txError || !paymentTx) {
                    logWompiWebhookError('[WompiWebhook] Transaction not found for reference', txError || new Error('payment_transaction_not_found'), { reference })
                    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
                }

                if (paymentTx.organization_id) {
                    await updateWompiSyncStatus(
                        paymentTx.organization_id,
                        environment || (transaction.redirect_url?.includes('sandbox') ? 'sandbox' : 'production')
                    )
                }

                // 2. Update Transaction Status
                await (await createClient())
                    .from('payment_transactions')
                    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
                    .eq('id', paymentTx.id)

                // 3. Update All Linked Invoices
                const invoiceIds = paymentTx.invoice_ids

                // --- NEW: DIRECT BRANDING UPGRADE LOGIC ---
                if (paymentTx.metadata?.type === 'branding_upgrade' && paymentTx.organization_id) {
                    logWompiWebhookInfo('[WompiWebhook] Processing branding upgrade', { organizationId: paymentTx.organization_id })

                    const { performBrandingUpgrade } = await import('@/modules/core/branding/tier-actions')
                    const upgradeResult = await performBrandingUpgrade({
                        organization_id: paymentTx.organization_id,
                        new_tier_id: paymentTx.metadata.target_tier || 'whitelabel'
                    })

                    if (upgradeResult.success) {
                        logWompiWebhookInfo('[WompiWebhook] Branding upgrade completed', { organizationId: paymentTx.organization_id })

                        // Register Billable Event for Revenue/Commissions
                        const { registerBillableEvent } = await import('@/modules/billing/platform/revenue/actions')
                        await registerBillableEvent({
                            organization_id: paymentTx.organization_id,
                            event_type: 'addon',
                            amount: paymentTx.amount_in_cents / 100,
                            description: `Upgrade Directo: Branding Total (Ref: ${reference})`,
                            currency: paymentTx.currency
                        })
                    } else {
                        logWompiWebhookError(`[Webhook] ❌ Failed to upgrade branding:`, upgradeResult.error)
                    }

                    // After processing upgrade, we don't need to check for invoices
                    return NextResponse.json({ success: true }, { status: 200 })
                }

                // --- NEW: SUBSCRIPTION PAYMENT LOGIC ---
                if (paymentTx.metadata?.type === 'subscription_payment' && paymentTx.organization_id) {
                    logWompiWebhookInfo('[WompiWebhook] Processing subscription payment', { organizationId: paymentTx.organization_id })

                    // 1. Update saas_subscriptions table
                    const { data: subscription } = await (await createClient())
                        .from('saas_subscriptions')
                        .select('id, current_period_end')
                        .eq('organization_id', paymentTx.organization_id)
                        .maybeSingle()

                    if (subscription) {
                        let newEnd = new Date(subscription.current_period_end || new Date())
                        
                        // Check if it's a platform manual invoice with specific date
                        if (paymentTx.metadata?.platform_invoice && paymentTx.metadata?.invoice_id) {
                            const { data: invoice } = await (await createClient())
                                .from('saas_platform_invoices')
                                .select('billing_period_end')
                                .eq('id', paymentTx.metadata.invoice_id)
                                .single()
                            
                            if (invoice?.billing_period_end) {
                                const invoiceEnd = new Date(invoice.billing_period_end);
                                // Safety: Only update if the invoice provides a FURTHUR end date
                                if (invoiceEnd > newEnd) {
                                    newEnd = invoiceEnd;
                                }
                            }
                        } else {
                            // Standard recurrence logic
                            newEnd.setMonth(newEnd.getMonth() + 1)
                        }

                        await (await createClient())
                            .from('saas_subscriptions')
                            .update({
                                status: 'active',
                                current_period_end: newEnd.toISOString(),
                                last_payment_at: new Date().toISOString(),
                                billing_method: paymentTx.metadata?.platform_invoice ? 'MANUAL' : 'AUTOMATIC',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', subscription.id)

                        logWompiWebhookInfo('[WompiWebhook] Subscription updated after payment', {
                            organizationId: paymentTx.organization_id,
                            subscriptionId: subscription.id,
                            periodEnd: newEnd.toISOString(),
                        })
                    }

                    // 1.2. Unsuspend organization if it was suspended
                    const { error: unsuspendError } = await (await createClient())
                        .from('organizations')
                        .update({ status: 'active', updated_at: new Date().toISOString() })
                        .eq('id', paymentTx.organization_id)
                        .eq('status', 'suspended')
                    
                    if (unsuspendError) {
                        logWompiWebhookError('[Webhook] ❌ Error unsuspending organization:', unsuspendError);
                    }

                    // 1.5. If this is a Platform Manual Invoice, mark it as PAID
                    if (paymentTx.metadata?.platform_invoice && paymentTx.metadata?.invoice_id) {
                        try {
                            const { error: platformInvoiceError } = await (await createClient())
                                .from('saas_platform_invoices')
                                .update({ 
                                    status: 'PAID', 
                                    payment_transaction_id: paymentTx.id,
                                    updated_at: new Date().toISOString() 
                                })
                                .eq('id', paymentTx.metadata.invoice_id);

                            if (platformInvoiceError) {
                                logWompiWebhookError('[Webhook] ❌ Error updating platform invoice status:', platformInvoiceError);
                            } else {
                                logWompiWebhookInfo('[WompiWebhook] Platform invoice marked as paid', { platformInvoiceId: paymentTx.metadata.invoice_id });
                            }
                        } catch (e: any) {
                            logWompiWebhookError('[Webhook] ❌ Unexpected error updating platform invoice:', e);
                        }
                    }

                    // 2. Register Billable Event (This is the revenue)
                    const { registerBillableEvent } = await import('@/modules/billing/platform/revenue/actions')
                    await registerBillableEvent({
                        organization_id: paymentTx.organization_id,
                        event_type: 'subscription_base',
                        amount: paymentTx.amount_in_cents / 100,
                        description: `Pago Suscripción: Agency OS (Ref: ${reference})`,
                        currency: paymentTx.currency as any
                    })

                    // 3. Send Notification
                    await (await createClient()).from('notifications').insert({
                        organization_id: paymentTx.organization_id,
                        type: 'system',
                        title: '✅ Pago de Suscripción Recibido',
                        message: `Hemos recibido tu pago de $${(paymentTx.amount_in_cents / 100).toFixed(2)}. Tu plan sigue activo.`,
                        read: false
                    })

                    return NextResponse.json({ success: true }, { status: 200 })
                }
                // ------------------------------------------

                if (invoiceIds && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
                    // ... (existing invoice update logic) ...

                    const { data: updatedInvoices, error: updateError } = await (await createClient())
                        .from('invoices')
                        .update({ status: 'paid' })
                        .in('id', invoiceIds)
                        .select('id, client_id, number, total, organization_id') // Added organization_id

                    if (updateError) {
                        // ... error handling ...
                    } else if (updatedInvoices && updatedInvoices.length > 0) {
                        const organizationId = updatedInvoices[0].organization_id
                        const totalPaid = updatedInvoices.reduce((acc, curr) => acc + curr.total, 0)

                        // 1. Notify Client (Portal)
                        // ... (existing client_events insert) ...

                        // 2. Notify Agency Admins (Internal)
                        if (organizationId) {
                            const { data: members } = await (await createClient())
                                .from('organization_members')
                                .select('user_id')
                                .eq('organization_id', organizationId)

                            if (members && members.length > 0) {
                                const notifications = members.map(member => ({
                                    user_id: member.user_id,
                                    organization_id: organizationId,
                                    type: 'payment_received',
                                    title: '💰 Pago Recibido',
                                    message: `Pago de $${totalPaid.toLocaleString()} recibido (Ref: ${reference})`,
                                    read: false,
                                    client_id: updatedInvoices[0].client_id
                                }))

                                const { error: notifError } = await (await createClient())
                                    .from('notifications')
                                    .insert(notifications)

                                if (notifError) logWompiWebhookError('Error creating internal notifications:', notifError)
                                else logWompiWebhookInfo('[WompiWebhook] Internal notifications sent', { membersCount: members.length })
                            }
                        }

                        // ... (existing domain logging) ...
                    }
                }

            } else if (reference.startsWith('ORD-')) {
                logWompiWebhookInfo('[WompiWebhook] Detected storefront order payment', { reference })

                const supabase = await createClient()

                // 1. Find transaction record
                const { data: paymentTx, error: txError } = await supabase
                    .from('payment_transactions')
                    .select('*')
                    .eq('reference', reference)
                    .maybeSingle()

                if (txError) {
                    logWompiWebhookError('[WompiWebhook] Error querying payment transaction for order:', txError, { reference })
                }

                if (paymentTx) {
                    if (paymentTx.organization_id) {
                        await updateWompiSyncStatus(
                            paymentTx.organization_id,
                            environment || (transaction.redirect_url?.includes('sandbox') ? 'sandbox' : 'production')
                        )
                    }

                    // 2. Mark Transaction as APPROVED
                    await supabase
                        .from('payment_transactions')
                        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
                        .eq('id', paymentTx.id)

                    // 3. Atomically decrement stock for all purchased items
                    const metadata = (paymentTx.metadata as any) || {}
                    const itemsSnapshot = metadata.items || metadata.items_snapshot || []

                    if (Array.isArray(itemsSnapshot) && itemsSnapshot.length > 0 && paymentTx.organization_id) {
                        const itemsToDecrement = itemsSnapshot.map((item: any) => ({
                            catalogItemId: item.catalog_item_id || item.itemId || item.id,
                            variantId: item.variant_id || item.variantId || null,
                            quantity: Math.max(1, Number(item.quantity || 1)),
                        }))

                        try {
                            const { decrementStockAction } = await import('@/modules/features/catalog/actions')
                            const decrementResult = await decrementStockAction(
                                {
                                    organizationId: paymentTx.organization_id,
                                    items: itemsToDecrement,
                                },
                                { organizationId: paymentTx.organization_id }
                            )

                            logWompiWebhookInfo('[WompiWebhook] Decremented stock for storefront order', {
                                reference,
                                success: decrementResult.success,
                                decrementedCount: decrementResult.decrementedItems?.length || 0,
                                error: decrementResult.error,
                            })
                        } catch (stockErr) {
                            logWompiWebhookError('[WompiWebhook] Failed to decrement stock for storefront order:', stockErr, { reference })
                        }
                    }

                    // 4. Send Internal Admin Notifications
                    if (paymentTx.organization_id) {
                        const { data: members } = await supabase
                            .from('organization_members')
                            .select('user_id')
                            .eq('organization_id', paymentTx.organization_id)

                        if (members && members.length > 0) {
                            const totalFormatted = (paymentTx.amount_in_cents / 100).toLocaleString('es-CO')
                            const customerName = metadata.customer?.name || 'Cliente'

                            const notifications = members.map(member => ({
                                user_id: member.user_id,
                                organization_id: paymentTx.organization_id,
                                type: 'order_paid',
                                title: '🛒 Nuevo Pedido Pagado (Wompi)',
                                message: `Pedido ${reference} de ${customerName} por $${totalFormatted} COP aprobado exitosamente.`,
                                read: false,
                            }))

                            const { error: notifError } = await supabase
                                .from('notifications')
                                .insert(notifications)

                            if (notifError) logWompiWebhookError('Error creating order notifications:', notifError)
                            else logWompiWebhookInfo('[WompiWebhook] Order notifications sent to agency members', { membersCount: members.length })
                        }

                        // 5. Log Domain Event (Audit)
                        await logDomainEvent({
                            entity_type: 'order',
                            entity_id: paymentTx.id,
                            event_type: 'order.paid',
                            payload: {
                                reference: reference,
                                amount_in_cents: paymentTx.amount_in_cents,
                                currency: paymentTx.currency,
                                method: 'wompi_online',
                                items_count: itemsSnapshot.length,
                            },
                            triggered_by: 'webhook',
                            actor_id: 'wompi'
                        })
                    }
                } else {
                    logWompiWebhookInfo('[WompiWebhook] Order reference not pre-registered in payment_transactions, skipping DB updates', { reference })
                }

                return NextResponse.json({ success: true }, { status: 200 })

            } else {
                logWompiWebhookInfo('[WompiWebhook] Detected legacy/direct payment')
                let invoiceNumber = reference;

                if (reference.startsWith('INV-')) {
                    const parts = reference.split('-')
                    if (parts.length >= 3) {
                        invoiceNumber = parts.slice(1, -1).join('-')
                    }
                }

                logWompiWebhookInfo('[WompiWebhook] Extracted invoice number', { invoiceNumber, reference })

                if (invoiceNumber) {
                    const { data: updatedInvoice, error } = await (await createClient())
                        .from('invoices')
                        .update({ status: 'paid' })
                        .eq('number', invoiceNumber)
                        .select('id, client_id, total')
                        .single()

                    if (error) {
                        logWompiWebhookError('Error updating invoice status (Legacy/Direct):', error)
                    } else {
                        logWompiWebhookInfo('[WompiWebhook] Invoice marked as paid via legacy/direct webhook', { invoiceNumber })

                        // Create Client Event
                        if (updatedInvoice) {
                            await (await createClient()).from('client_events').insert({
                                client_id: updatedInvoice.client_id,
                                type: 'payment',
                                title: 'Pago Recibido',
                                description: `Se ha confirmado el pago de la factura #${invoiceNumber}`,
                                metadata: {
                                    reference: reference,
                                    invoice_number: invoiceNumber,
                                    amount: updatedInvoice.total
                                },
                                icon: 'CreditCard'
                            })

                            // Log Domain Event (Audit)
                            await logDomainEvent({
                                entity_type: 'invoice',
                                entity_id: updatedInvoice.id,
                                event_type: 'invoice.paid',
                                payload: {
                                    reference: reference,
                                    invoice_number: invoiceNumber,
                                    method: 'wompi_direct'
                                },
                                triggered_by: 'webhook',
                                actor_id: 'wompi'
                            })
                        }
                    }
                }
            }
        } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
            logWompiWebhookInfo('[WompiWebhook] Transaction failed', { status: transaction.status, reference: transaction.reference })
            // Handle Payment Failure -> Move Process to 'payment_issue'

            // 1. Resolve Lead/Invoice
            const reference = transaction.reference
            let invoiceNumber = reference
            if (reference.startsWith('INV-')) {
                const parts = reference.split('-')
                if (parts.length >= 3) invoiceNumber = parts.slice(1, -1).join('-')
            }

            // Find Invoice to get Client/Lead
            const { data: invoice } = await (await createClient())
                .from('invoices')
                .select('id, client_id, organization_id') // client_id determines lead
                .eq('number', invoiceNumber)
                .single()

            if (invoice?.client_id) {
                try {
                    const { ProcessEngine } = await import('@/modules/features/crm/services/process-engine/engine')

                    // Check for active process
                    const process = await ProcessEngine.getActiveProcess(invoice.client_id)

                    if (process) {
                        // Attempt transition to payment_issue
                        // We check if it's a valid transition first to avoid errors
                        if (process.context.state.allowed_next_states.includes('payment_issue')) {
                            await ProcessEngine.transition(
                                process.id,
                                'payment_issue',
                                'webhook',
                                `Payment ${transaction.status} (Ref: ${reference})`
                            )
                            logWompiWebhookInfo('[WompiWebhook] Moved process to payment_issue', { processId: process.id })

                            // Create Notification
                            await (await createClient()).from('notifications').insert({
                                organization_id: invoice.organization_id,
                                user_id: process.lead_id, // This might be wrong, leads aren't users. We should notify admins.
                                type: 'payment_failed',
                                title: '❌ Fallo en Pago',
                                message: `El pago de la factura #${invoiceNumber} ha fallado/sido rechazado.`,
                                read: false
                            })
                        } else {
                            logWompiWebhookInfo('[WompiWebhook] Process cannot transition to payment_issue', {
                                processId: process.id,
                                currentState: process.current_state,
                            })
                        }
                    }
                } catch (e) {
                    logWompiWebhookError("[Webhook] Error processing failure logic:", e)
                }
            }
        } else {
            logWompiWebhookInfo('[WompiWebhook] Transaction status ignored', { status: transaction.status })
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        logWompiWebhookError('Error processing Wompi webhook:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
