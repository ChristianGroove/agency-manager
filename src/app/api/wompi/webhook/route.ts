import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
    return NextResponse.json({
        status: 'active',
        message: 'Wompi Webhook Endpoint is reachable',
        time: new Date().toISOString()
    }, { status: 200 })
}

export async function POST(request: Request) {
    console.log('----- WOMPI WEBHOOK HIT -----')
    console.log('Time:', new Date().toISOString())

    try {
        const body = await request.json()
        console.log('Webhook Body:', JSON.stringify(body, null, 2))

        const { data, signature, timestamp, environment } = body

        // Wompi sends the transaction data inside 'data.transaction'
        const transaction = data.transaction

        if (!transaction) {
            console.log('No transaction data found in body')
            return NextResponse.json({ message: 'Event received' }, { status: 200 })
        }

        const eventsSecret = process.env.WOMPI_EVENTS_SECRET
        console.log('Events Secret Configured:', !!eventsSecret)

        if (!eventsSecret) {
            console.error('WOMPI_EVENTS_SECRET not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Validate Signature
        // Formula: SHA256(transaction.id + transaction.status + transaction.amount_in_cents + timestamp + eventsSecret)
        const signatureString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${eventsSecret}`
        const calculatedSignature = createHash('sha256').update(signatureString).digest('hex')

        console.log('Signature Check:')
        console.log('Received:', signature.checksum)
        console.log('Calculated:', calculatedSignature)

        if (calculatedSignature !== signature.checksum) {
            console.error('Invalid Wompi webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        console.log('Signature Valid. Updating Settings...')

        // Update Wompi Status in Settings
        const settingsUpdate = await supabaseAdmin
            .from('organization_settings')
            .update({
                wompi_last_sync: new Date().toISOString(),
                wompi_environment: environment || (transaction.redirect_url?.includes('sandbox') ? 'sandbox' : 'production')
            })
            .eq('id', 1)

        if (settingsUpdate.error) {
            console.error('Error updating settings:', settingsUpdate.error)
        } else {
            console.log('Settings updated successfully')
        }

        // Process Payment
        if (transaction.status === 'APPROVED') {
            const reference = transaction.reference
            console.log('Processing Approved Payment. Reference:', reference)

            if (reference.startsWith('PAY-')) {
                console.log('Detected Batch Payment (PAY-)')
                // 1. Find the transaction record
                const { data: paymentTx, error: txError } = await supabaseAdmin
                    .from('payment_transactions')
                    .select('*')
                    .eq('reference', reference)
                    .single()

                if (txError || !paymentTx) {
                    console.error('Transaction not found for reference:', reference)
                    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
                }

                // 2. Update Transaction Status
                await supabaseAdmin
                    .from('payment_transactions')
                    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
                    .eq('id', paymentTx.id)

                // 3. Update All Linked Invoices
                const invoiceIds = paymentTx.invoice_ids
                if (invoiceIds && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
                    const { error: updateError } = await supabaseAdmin
                        .from('invoices')
                        .update({ status: 'paid' })
                        .in('id', invoiceIds)

                    if (updateError) {
                        console.error('Error updating invoices:', updateError)
                        return NextResponse.json({ error: 'Failed to update invoices' }, { status: 500 })
                    }
                    console.log(`Invoices ${invoiceIds.join(', ')} marked as paid via Wompi batch payment`)
                }

            } else {
                console.log('Detected Legacy/Direct Payment')
                let invoiceNumber = reference;

                if (reference.startsWith('INV-')) {
                    const parts = reference.split('-')
                    if (parts.length >= 3) {
                        invoiceNumber = parts.slice(1, -1).join('-')
                    }
                }

                console.log('Extracted Invoice Number:', invoiceNumber)

                if (invoiceNumber) {
                    const { error } = await supabaseAdmin
                        .from('invoices')
                        .update({ status: 'paid' })
                        .eq('number', invoiceNumber)

                    if (error) {
                        console.error('Error updating invoice status (Legacy/Direct):', error)
                    } else {
                        console.log(`Invoice ${invoiceNumber} marked as paid via Wompi webhook (Legacy/Direct)`)
                    }
                }
            }
        } else {
            console.log('Transaction status is not APPROVED:', transaction.status)
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error('Error processing Wompi webhook:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
