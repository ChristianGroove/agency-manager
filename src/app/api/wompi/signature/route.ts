import { NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
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
            .select('*, client:clients(organization_id)')
            .in('id', invoiceIds)

        if (error || !invoices || invoices.length !== invoiceIds.length) {
            console.error('Error fetching invoices:', error)
            return NextResponse.json({ error: 'One or more invoices not found' }, { status: 404 })
        }

        // CRITICAL: Get organization_id from first invoice
        const firstInvoice = invoices[0]
        const organizationId = firstInvoice.client?.organization_id

        if (!organizationId) {
            console.error('Missing organization_id in invoice data')
            return NextResponse.json({ error: 'Invalid invoice configuration' }, { status: 400 })
        }

        // CRITICAL: Fetch organization-specific Wompi configuration
        const { data: orgSettings, error: settingsError } = await supabaseAdmin
            .from('organization_settings')
            .select('wompi_public_key, wompi_integrity_secret, wompi_currency')
            .eq('organization_id', organizationId)
            .single()

        if (settingsError || !orgSettings) {
            console.error('Error fetching org settings:', settingsError)
            return NextResponse.json({
                error: 'Payment gateway configuration not found for this organization'
            }, { status: 500 })
        }

        // Validate Wompi configuration exists
        if (!orgSettings.wompi_public_key || !orgSettings.wompi_integrity_secret) {
            console.error('Wompi not configured for organization:', organizationId)
            return NextResponse.json({
                error: 'Payment gateway not configured. Please contact your administrator.'
            }, { status: 400 })
        }

        // Calculate total amount
        const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
        const amountInCents = Math.round(totalAmount * 100)

        // Use organization-specific currency
        const currency = orgSettings.wompi_currency || 'COP'
        const integritySecret = orgSettings.wompi_integrity_secret

        // Generate unique reference for the TRANSACTION
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
        const reference = `PAY-${timestamp}-${randomSuffix}`

        // Create Payment Transaction Record
        const { error: transactionError } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
                id: randomUUID(), // Explicitly generate ID to bypass DB default issue
                reference,
                amount_in_cents: amountInCents,
                currency,
                invoice_ids: invoiceIds,
                organization_id: organizationId
            })

        if (transactionError) {
            console.error('Error creating transaction:', transactionError)
            return NextResponse.json({
                error: 'Failed to create transaction record',
                details: transactionError.message, // Expose db error to client for debugging
                hint: transactionError.hint
            }, { status: 500 })
        }

        // Generate Signature using organization's secret
        const signatureString = `${reference}${amountInCents}${currency}${integritySecret}`
        const signature = createHash('sha256').update(signatureString).digest('hex')

        // Return organization-specific public key
        return NextResponse.json({
            reference,
            amountInCents,
            currency,
            signature,
            publicKey: orgSettings.wompi_public_key
        })

    } catch (error: any) {
        console.error('Error generating Wompi signature:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
