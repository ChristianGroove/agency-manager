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
            // Reference format: INV-{invoiceNumber}-{timestamp}
            // We need to find the invoice by number. 
            // Extract invoice number. It's between first and second dash.
            // Example: INV-INV-12345-1700000000
            // Wait, my generation logic was `INV-${invoice.number}-${timestamp}`
            // Invoice number might contain dashes? Assuming standard format.

            // Safer: We can store the invoice ID in the reference or just match by number if unique.
            // Let's try to extract the number.
            // Split by '-'
            const parts = reference.split('-')
            // parts[0] = 'INV'
            // parts[last] = timestamp
            // The middle part is the invoice number. It might contain dashes itself.
            // So we join everything between first and last.
            const invoiceNumber = parts.slice(1, -1).join('-')

            if (invoiceNumber) {
                // Update Invoice
                const { error } = await supabase
                    .from('invoices')
                    .update({
                        status: 'paid',
                        // We could add a payment_date column or just rely on updated_at
                        // Let's assume we want to mark it paid.
                    })
                    .eq('number', invoiceNumber)

                if (error) {
                    console.error('Error updating invoice status:', error)
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
                }

                console.log(`Invoice ${invoiceNumber} marked as paid via Wompi webhook`)
            }
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error('Error processing Wompi webhook:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
