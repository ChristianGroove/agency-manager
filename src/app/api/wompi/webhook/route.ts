import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { data, signature, timestamp } = body

        // Wompi sends the transaction data inside 'data.transaction'
        const transaction = data.transaction

        if (!transaction) {
            // Sometimes Wompi sends different event types, check structure
            return NextResponse.json({ message: 'Event received' }, { status: 200 })
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

        if (calculatedSignature !== signature.checksum) {
            console.error('Invalid Wompi webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        // Process Payment
        if (transaction.status === 'APPROVED') {
            const reference = transaction.reference

            // Check if it's a batch payment (PAY-) or legacy single invoice (INV-)
            if (reference.startsWith('PAY-')) {
                // 1. Find the transaction record
                const { data: paymentTx, error: txError } = await supabase
                    .from('payment_transactions')
                    .select('*')
                    .eq('reference', reference)
                    .single()

                if (txError || !paymentTx) {
                    console.error('Transaction not found for reference:', reference)
                    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
                }

                // 2. Update Transaction Status
                await supabase
                    .from('payment_transactions')
                    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
                    .eq('id', paymentTx.id)

                // 3. Update All Linked Invoices
                const invoiceIds = paymentTx.invoice_ids
                if (invoiceIds && Array.isArray(invoiceIds) && invoiceIds.length > 0) {
                    const { error: updateError } = await supabase
                        .from('invoices')
                        .update({ status: 'paid' })
                        .in('id', invoiceIds)

                    if (updateError) {
                        console.error('Error updating invoices:', updateError)
                        return NextResponse.json({ error: 'Failed to update invoices' }, { status: 500 })
                    }
                    console.log(`Invoices ${invoiceIds.join(', ')} marked as paid via Wompi batch payment`)
                }

            } else if (reference.startsWith('INV-')) {
                // Legacy support for single invoice payments
                const parts = reference.split('-')
                // parts[0] = 'INV'
                // parts[last] = timestamp
                // The middle part is the invoice number.
                const invoiceNumber = parts.slice(1, -1).join('-')

                if (invoiceNumber) {
                    const { error } = await supabase
                        .from('invoices')
                        .update({ status: 'paid' })
                        .eq('number', invoiceNumber)

                    if (error) {
                        console.error('Error updating invoice status:', error)
                        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
                    }
                    console.log(`Invoice ${invoiceNumber} marked as paid via Wompi webhook (Legacy)`)
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error('Error processing Wompi webhook:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
