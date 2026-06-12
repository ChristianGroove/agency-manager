import { NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { isProductionRuntime } from '@/app/api/_guards/request-guards'

function logWompiSignatureError(label: string, error?: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function toPositiveAmount(value: unknown) {
    const amount = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(amount) && amount > 0 ? amount : null
}

function getPayabilityError(invoice: any) {
    const status = String(invoice.status || '').toLowerCase()
    const paymentStatus = String(invoice.payment_status || 'UNPAID').toUpperCase()

    if (status === 'paid' || paymentStatus === 'PAID') {
        return 'One or more invoices are already paid'
    }

    if (paymentStatus === 'PARTIALLY_PAID') {
        return 'Partially paid invoices require manual balance reconciliation'
    }

    return null
}

export async function POST(request: Request) {
    try {
        const { invoiceIds, portalToken } = await request.json()

        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return NextResponse.json({ error: 'Invoice IDs array is required' }, { status: 400 })
        }

        const uniqueInvoiceIds = Array.from(new Set(invoiceIds.map(id => typeof id === 'string' ? id.trim() : id)))
        if (!uniqueInvoiceIds.every(id => typeof id === 'string' && id.length > 0)) {
            return NextResponse.json({ error: 'Invalid invoice IDs' }, { status: 400 })
        }

        const normalizedPortalToken = typeof portalToken === 'string' ? portalToken.trim() : ''
        if (!normalizedPortalToken) {
            return NextResponse.json({ error: 'Portal token is required' }, { status: 401 })
        }

        const isUuidToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedPortalToken)
        let clientQuery = supabaseAdmin
            .from('leads')
            .select('id, organization_id, portal_token_never_expires, portal_token_expires_at')

        clientQuery = isUuidToken
            ? clientQuery.or(`portal_short_token.eq.${normalizedPortalToken},portal_token.eq.${normalizedPortalToken}`)
            : clientQuery.eq('portal_short_token', normalizedPortalToken)

        const { data: client, error: clientError } = await clientQuery.maybeSingle()

        if (clientError || !client) {
            return NextResponse.json({ error: 'Invalid portal token' }, { status: 401 })
        }

        if (client.portal_token_never_expires !== true &&
            client.portal_token_expires_at &&
            new Date(client.portal_token_expires_at) < new Date()) {
            return NextResponse.json({ error: 'Portal token expired' }, { status: 401 })
        }

        // Fetch all invoices using Admin client, scoped to the portal client.
        const { data: invoices, error } = await supabaseAdmin
            .from('invoices')
            .select('id, total, status, payment_status, client_id, organization_id, client:leads!client_id(id, organization_id)')
            .in('id', uniqueInvoiceIds)
            .eq('client_id', client.id)
            .eq('organization_id', client.organization_id)
            .is('deleted_at', null)
            .neq('status', 'cancelled')

        if (error || !invoices || invoices.length !== uniqueInvoiceIds.length) {
            logWompiSignatureError('Error fetching invoices:', error)
            return NextResponse.json({ error: 'One or more invoices not found' }, { status: 404 })
        }

        const payabilityError = invoices.map(getPayabilityError).find(Boolean)
        if (payabilityError) {
            return NextResponse.json({ error: payabilityError }, { status: 409 })
        }

        const invoiceAmounts: number[] = []
        for (const invoice of invoices) {
            const amount = toPositiveAmount(invoice.total)
            if (amount === null) {
                return NextResponse.json({ error: 'Invalid invoice amount' }, { status: 400 })
            }
            invoiceAmounts.push(amount)
        }

        // CRITICAL: Get organization_id from first invoice
        const firstInvoice = invoices[0]
        const invoiceClient = Array.isArray(firstInvoice.client) ? firstInvoice.client[0] : firstInvoice.client
        const organizationId = invoiceClient?.organization_id

        if (!organizationId || organizationId !== client.organization_id) {
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
            logWompiSignatureError('Error fetching org settings:', settingsError)
            return NextResponse.json({
                error: 'Payment gateway configuration not found for this organization'
            }, { status: 500 })
        }

        // Validate Wompi configuration exists
        if (!orgSettings.wompi_public_key || !orgSettings.wompi_integrity_secret) {
            logWompiSignatureError('Wompi not configured for organization:', organizationId)
            return NextResponse.json({
                error: 'Payment gateway not configured. Please contact your administrator.'
            }, { status: 400 })
        }

        // Calculate total amount
        const totalAmount = invoiceAmounts.reduce((sum, amount) => sum + amount, 0)
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
                invoice_ids: uniqueInvoiceIds,
                organization_id: organizationId,
                metadata: {
                    source: 'client_portal',
                    client_id: client.id,
                    invoice_count: uniqueInvoiceIds.length
                }
            })

        if (transactionError) {
            logWompiSignatureError('Error creating transaction:', transactionError)
            return NextResponse.json({
                error: 'Failed to create transaction record'
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

    } catch (error: unknown) {
        logWompiSignatureError('Error generating Wompi signature:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}
