import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
    try {
        const { invoiceIds } = await request.json()

        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return NextResponse.json({ error: 'Invoice IDs array is required' }, { status: 400 })
        }

        // Fetch all invoices using Admin client
        const { data: invoices, error } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .in('id', invoiceIds)

        if (error || !invoices || invoices.length !== invoiceIds.length) {
            console.error('Error fetching invoices:', error)
            return NextResponse.json({ error: 'One or more invoices not found' }, { status: 404 })
        }

        // Calculate total amount
        const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
        const amountInCents = Math.round(totalAmount * 100)

        const currency = process.env.NEXT_PUBLIC_WOMPI_CURRENCY || 'COP'
        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET

        if (!integritySecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Generate unique reference for the TRANSACTION
        const timestamp = Date.now()
        // Use a shorter reference format: PAY-{timestamp}-{random4chars}
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
        const reference = `PAY-${timestamp}-${randomSuffix}`

        // Create Payment Transaction Record
        const { error: transactionError } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
                reference,
                amount_in_cents: amountInCents,
                currency,
                status: 'PENDING',
                invoice_ids: invoiceIds
            })

        if (transactionError) {
            console.error('Error creating transaction:', transactionError)
            return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
        }

        // Generate Signature
        const signatureString = `${reference}${amountInCents}${currency}${integritySecret}`
        const signature = createHash('sha256').update(signatureString).digest('hex')

        return NextResponse.json({
            reference,
            amountInCents,
            currency,
            signature,
            publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY
        })

    } catch (error) {
        console.error('Error generating Wompi signature:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
