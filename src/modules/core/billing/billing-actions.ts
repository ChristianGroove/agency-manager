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

    // 1. Get current plan details dynamically
    const { getCurrentOrganizationApp } = require("@/modules/core/saas/app-management-actions")
    const currentApp = await getCurrentOrganizationApp()

    if (!currentApp?.app) throw new Error("No hay un plan activo configurado para esta organización")

    const app = currentApp.app
    const amount = app.price_monthly || 29
    const currency = 'USD' // For now we keep USD as standard for the catalog price
    const reference = `SUBSCRIPTION-PAY-${orgId.slice(0, 8)}-${Date.now()}`

    // 2. Generate Integrity Signature
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || ''
    const amountInCents = amount * 100
    const signatureRaw = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex')

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || ''

    console.log('[Wompi Debug] Dynamic Transaction Data:')
    console.log(`- Plan: ${app.name}`)
    console.log(`- Reference: ${reference}`)
    console.log(`- Amount: ${amountInCents} ${currency}`)

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
                concept: `Suscripción Mensual: ${app.name}`,
                app_id: app.id
            }
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating subscription transaction:", error)
        throw new Error("No se pudo iniciar el pago: " + (error.message || "Unknown error"))
    }

    // 4. Return Wompi parameters (Converted to whatever gateway needs)
    // Note: If Wompi requires COP, we should have a conversion logic, 
    // but the DB price is usually in USD. Assuming the widget handles the currency passed.
    return {
        success: true,
        reference,
        amountInCents,
        currency,
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
