/**
 * Notification System - Helper Functions
 * 
 * This file contains helper functions for:
 * 1. Checking for upcoming subscriptions (2 days before billing)
 * 2. Generating payment reminder notifications
 * 3. Auto-generating invoices on billing date
 */

import { supabase } from "@/lib/supabase"

type Subscription = {
    id: string
    client_id: string
    name: string
    amount: number
    frequency: string
    next_billing_date: string
    status: string
    service_type: string
}

type Client = {
    id: string
    name: string
}

/**
 * Check for subscriptions that need payment reminders or invoice generation
 * Should be called when the app loads or on a timer
 */
export async function checkUpcomingPayments() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Calculate 2 days from now for reminders
        const twoDaysFromNow = new Date(today)
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
        twoDaysFromNow.setHours(0, 0, 0, 0)

        // Fetch active subscriptions
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                clients (
                    id,
                    name
                )
            `)
            .eq('status', 'active')
            .not('next_billing_date', 'is', null)

        if (error) throw error
        if (!subscriptions || subscriptions.length === 0) return

        // Process each subscription
        for (const sub of subscriptions) {
            const billingDate = new Date(sub.next_billing_date)
            billingDate.setHours(0, 0, 0, 0)

            // Check if billing is in 2 days (send reminder)
            if (billingDate.getTime() === twoDaysFromNow.getTime()) {
                await createPaymentReminderNotification(user.id, sub, sub.clients)
            }

            // Check if billing is today (generate invoice)
            if (billingDate.getTime() === today.getTime()) {
                await generateAutomaticInvoice(user.id, sub, sub.clients)
            }
        }

        // Check for overdue invoices
        await checkOverdueInvoices(user.id)

    } catch (error) {
        console.error('Error checking upcoming payments:', error)
    }
}

/**
 * Create a payment reminder notification (2 days before billing)
 */
async function createPaymentReminderNotification(
    userId: string,
    subscription: Subscription,
    client: Client
) {
    try {
        // Check if notification already exists to avoid duplicates
        const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('type', 'payment_reminder')
            .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
            .single()

        if (existing) return // Already notified

        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'payment_reminder',
                title: '⏰ Próximo cobro en 2 días',
                message: `El servicio "${subscription.name}" de ${client.name} se cobrará en 2 días. Monto: $${subscription.amount.toLocaleString()}`,
                subscription_id: subscription.id,
                client_id: subscription.client_id,
                action_url: `/clients/${subscription.client_id}`,
                read: false
            })

        if (error) throw error
        console.log(`✅ Reminder created for subscription ${subscription.id}`)
    } catch (error) {
        console.error('Error creating payment reminder:', error)
    }
}

/**
 * Generate automatic invoice when billing date arrives
 */
async function generateAutomaticInvoice(
    userId: string,
    subscription: Subscription,
    client: Client
) {
    try {
        // Check if invoice already exists for this billing cycle
        const { data: existing } = await supabase
            .from('invoices')
            .select('id')
            .eq('client_id', subscription.client_id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .single()

        if (existing) return // Already generated

        // Generate invoice number
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
        const invoiceNumber = `INV-${timestamp}-${randomSuffix}`

        // Calculate next billing date and due date
        const currentBillingDate = new Date(subscription.next_billing_date)
        let nextBillingDate: Date | null = new Date(currentBillingDate)
        let dueDate = new Date(currentBillingDate)

        switch (subscription.frequency) {
            case 'biweekly':
                nextBillingDate.setDate(nextBillingDate.getDate() + 15)
                break
            case 'monthly':
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
                break
            case 'quarterly':
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
                break
            case 'yearly':
                nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
                break
            case 'one-time':
                nextBillingDate = null
                dueDate.setDate(dueDate.getDate() + 30)
                break
        }

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                client_id: subscription.client_id,
                number: invoiceNumber,
                date: new Date().toISOString(),
                due_date: dueDate.toISOString(),
                items: [{
                    description: subscription.name,
                    quantity: 1,
                    price: subscription.amount
                }],
                total: subscription.amount,
                status: 'pending',
                sent: false
            })
            .select()
            .single()

        if (invoiceError) throw invoiceError

        // Update subscription next billing date
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                next_billing_date: nextBillingDate ? nextBillingDate.toISOString() : null,
                invoice_id: invoice.id
            })
            .eq('id', subscription.id)

        if (updateError) throw updateError

        // Create notification
        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'invoice_generated',
                title: '📄 Documento generado',
                message: `Se generó el documento ${invoiceNumber} para ${client.name}. Monto: $${subscription.amount.toLocaleString()}`,
                subscription_id: subscription.id,
                client_id: subscription.client_id,
                action_url: `/invoices/${invoice.id}`,
                read: false
            })

    } catch (error) {
        console.error('Error generating automatic invoice:', error)
    }
}

/**
 * Check for overdue invoices and notify admin
 */
async function checkOverdueInvoices(userId: string) {
    try {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients(id, name)
            `)
            .eq('status', 'pending')
            .lt('due_date', new Date().toISOString())

        if (error) throw error
        if (!invoices || invoices.length === 0) return

        for (const invoice of invoices) {
            // Check if we already notified recently (e.g., in last 3 days)
            const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('type', 'payment_due')
                .eq('action_url', `/invoices/${invoice.id}`)
                .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
                .single()

            if (!existing) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'payment_due',
                        title: '⚠️ Documento Vencido',
                        message: `El documento ${invoice.number} de ${invoice.client.name} está vencido. Monto: $${invoice.total.toLocaleString()}`,
                        client_id: invoice.client_id,
                        action_url: `/invoices/${invoice.id}`,
                        read: false
                    })
                console.log(`✅ Overdue notification sent for invoice ${invoice.number}`)
            }
        }
    } catch (error) {
        console.error('Error checking overdue invoices:', error)
    }
}

/**
 * Manually trigger check (for testing purposes)
 */
export async function manualCheckUpcomingPayments() {
    console.log('🔄 Manually checking for upcoming payments...')
    await checkUpcomingPayments()
    console.log('✅ Check complete')
}
