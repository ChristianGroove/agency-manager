'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// ============================================
// STRIPE CONNECT EXPRESS - PLACEHOLDER
// ============================================
// Este módulo será completado cuando se integre Stripe Connect
// Por ahora, provee la estructura y stubs para desarrollo

/**
 * Iniciar onboarding de Stripe Connect Express
 * Crea un account link para que el reseller complete el onboarding
 */
export async function initiateConnectOnboarding(): Promise<{
    success: boolean
    onboarding_url?: string
    error?: string
}> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { success: false, error: 'Organización no encontrada' }
    }

    // Verificar si ya existe cuenta
    const { data: existingAccount } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .single()

    if (existingAccount?.onboarding_complete) {
        return { success: false, error: 'El onboarding ya está completado' }
    }

    // TODO: Integrar Stripe SDK
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const account = await stripe.accounts.create({ type: 'express' })
    // const accountLink = await stripe.accountLinks.create({
    //     account: account.id,
    //     refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments/refresh`,
    //     return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments/complete`,
    //     type: 'account_onboarding',
    // })

    // Placeholder: crear registro en BD
    const { error } = await supabase
        .from('payment_accounts')
        .upsert({
            organization_id: orgId,
            provider: 'stripe_connect',
            stripe_account_id: null, // Se llenará con Stripe real
            onboarding_complete: false,
            charges_enabled: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString()
        })

    if (error) {
        return { success: false, error: error.message }
    }

    // En producción, retornaríamos el accountLink.url
    return {
        success: true,
        onboarding_url: '/settings/payments/connect-placeholder',
        error: 'PLACEHOLDER: Stripe Connect no integrado aún. Esta URL es temporal.'
    }
}

/**
 * Obtener estado de la cuenta Connect
 */
export async function getConnectAccountStatus(): Promise<{
    exists: boolean
    onboarding_complete: boolean
    payouts_enabled: boolean
    stripe_account_id: string | null
}> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return {
            exists: false,
            onboarding_complete: false,
            payouts_enabled: false,
            stripe_account_id: null
        }
    }

    const { data } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .single()

    if (!data) {
        return {
            exists: false,
            onboarding_complete: false,
            payouts_enabled: false,
            stripe_account_id: null
        }
    }

    return {
        exists: true,
        onboarding_complete: data.onboarding_complete,
        payouts_enabled: data.payouts_enabled,
        stripe_account_id: data.stripe_account_id
    }
}

/**
 * Ejecutar payout a una cuenta Connect
 * Solo super admin - llamado después de aprobar settlement
 */
export async function executeConnectPayout(settlement_id: string): Promise<{
    success: boolean
    payout_id?: string
    error?: string
}> {
    const supabase = await createClient()

    // 1. Obtener settlement
    const { data: settlement, error: settError } = await supabase
        .from('settlements')
        .select('*, reseller:organizations!reseller_org_id(id, name)')
        .eq('id', settlement_id)
        .single()

    if (settError || !settlement) {
        return { success: false, error: 'Liquidación no encontrada' }
    }

    if (settlement.status !== 'approved') {
        return { success: false, error: 'Liquidación debe estar aprobada para ejecutar payout' }
    }

    // 2. Obtener cuenta Connect del reseller
    const { data: paymentAccount } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('organization_id', settlement.reseller_org_id)
        .single()

    if (!paymentAccount || !paymentAccount.payouts_enabled) {
        return { success: false, error: 'El reseller no tiene cuenta de payout habilitada' }
    }

    // Marcar como processing
    await supabase
        .from('settlements')
        .update({ status: 'processing' })
        .eq('id', settlement_id)

    // TODO: Integrar Stripe SDK para transferencia real
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const transfer = await stripe.transfers.create({
    //     amount: Math.round(settlement.net_payout * 100), // Stripe usa centavos
    //     currency: 'usd',
    //     destination: paymentAccount.stripe_account_id,
    //     metadata: {
    //         settlement_id: settlement.id,
    //         period: `${settlement.period_start} - ${settlement.period_end}`
    //     }
    // })

    // Placeholder: simular éxito
    const mockPayoutId = `po_mock_${Date.now()}`

    // Actualizar settlement
    const { error: updateError } = await supabase
        .from('settlements')
        .update({
            status: 'completed',
            stripe_payout_id: mockPayoutId,
            paid_at: new Date().toISOString()
        })
        .eq('id', settlement_id)

    if (updateError) {
        // Rollback a approved si falla
        await supabase
            .from('settlements')
            .update({ status: 'approved' })
            .eq('id', settlement_id)
        return { success: false, error: updateError.message }
    }

    return {
        success: true,
        payout_id: mockPayoutId,
        error: 'PLACEHOLDER: Payout simulado. Stripe Connect no integrado aún.'
    }
}
