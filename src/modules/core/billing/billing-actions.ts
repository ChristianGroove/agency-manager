"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

import { supabaseAdmin } from "@/lib/supabase-admin"
import crypto from "crypto"

export async function createBillingPortalSession() {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { error: "Organization not found" }
    }

    // 1. Check for Stripe
    if (process.env.STRIPE_SECRET_KEY) {
        // TODO: Implement actual Stripe Portal logic when keys are available
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        // const session = await stripe.billingPortal.sessions.create(...)
        // return { url: session.url }
        console.log(`[Billing] Stripe key detected but logic pending. Redirecting to internal portal for now.`)
    }

    // 2. Fallback to Internal Portal (Wompi / Manual)
    console.log(`[Billing] Redirecting to internal portal for org: ${orgId}`)
    return {
        url: "/platform/settings?tab=subscription"
    }
}

export async function createSubscriptionPaymentTransaction() {
    const crypto = require('crypto')
    const orgId = await getCurrentOrganizationId()

    console.log('[Wompi Debug] Entering createSubscriptionPaymentTransaction')
    console.log(`- Org ID: ${orgId}`)

    if (!orgId) throw new Error("No organization context")

    // 1. Get Plan Details (Standard Pixy Price)
    const amount = 29 // USD
    const reference = `SUBSCRIPTION-PAY-${orgId.slice(0, 8)}-${Date.now()}`

    // 2. Generate Integrity Signature (Logged for verification, but not returned yet)
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || ''
    const signatureRaw = `${reference}${amount * 100}USD${integritySecret}`
    const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex')

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_prod_yLQNKtKrUhFcIu1HLcLsVjJO3zLWbZBT'

    console.log('[Wompi Debug] Transaction Data:')
    console.log(`- Reference: ${reference}`)
    console.log(`- Amount: ${amount * 100} cents`)
    console.log(`- Currency: USD`)
    console.log(`- Signature Length: ${signature.length}`)

    // 3. Create Transaction in DB
    const { data: tx, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
            organization_id: orgId,
            reference,
            amount_in_cents: amount * 100,
            currency: 'USD',
            status: 'PENDING',
            invoice_ids: [],
            metadata: {
                type: 'subscription_payment',
                concept: 'Suscripción Mensual: Agency OS'
            }
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating subscription transaction:", error)
        throw new Error("No se pudo iniciar el pago: " + (error.message || "Unknown error"))
    }

    // 4. Return Wompi parameters
    return {
        success: true,
        reference,
        amountInCents: 11500000, // 115,000 COP in cents
        currency: 'COP',
        publicKey,
        signature,
    }
}

export async function getSubscriptionHistory() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'APPROVED') // Strictly approved only
        .contains('metadata', { type: 'subscription_payment' }) // Strictly subscription payments only
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error("Error fetching subscription history:", error)
        return []
    }

    return data
}
