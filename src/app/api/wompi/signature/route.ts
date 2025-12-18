import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
    try {
        const { invoiceId } = await request.json()

        if (!invoiceId) {
            return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
        }

        // Fetch invoice details
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const currency = process.env.NEXT_PUBLIC_WOMPI_CURRENCY || 'COP'
        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET

        if (!integritySecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Wompi requires amount in cents (e.g., 10000 COP -> 1000000 cents)
        const amountInCents = Math.round(invoice.total * 100)

        // Generate unique reference
        // Format: INV-{invoiceId}-{timestamp} to ensure uniqueness even if retried
        const timestamp = Date.now()
        const reference = `INV-${invoice.number}-${timestamp}`

        // Generate Signature
        // Formula: SHA256(reference + amountInCents + currency + integritySecret)
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
