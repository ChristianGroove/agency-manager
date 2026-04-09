"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================
// TYPES
// ============================================

export interface PaymentGatewayConfig {
    id: string
    gateway_name: 'stripe' | 'mercadopago' | 'paypal' | 'wompi'
    display_name: string
    is_enabled: boolean
    is_live_mode: boolean
    public_key: string | null
    secret_key_ref: string | null
    config: Record<string, any>
    platform_fee_percent: number
    platform_fee_fixed_cents: number
    supports_connect: boolean
    supports_subscriptions: boolean
    supports_invoicing: boolean
    last_tested_at: string | null
    test_result: string | null
}

// ============================================
// GET ALL GATEWAYS
// ============================================

export async function getPaymentGateways(): Promise<PaymentGatewayConfig[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('payment_gateway_config')
        .select('*')
        .order('gateway_name')

    if (error) {
        console.error('Error fetching payment gateways:', error)
        return []
    }

    return data as PaymentGatewayConfig[]
}

// ============================================
// UPDATE GATEWAY CONFIG
// ============================================

export async function updatePaymentGateway(
    gatewayName: string,
    updates: Partial<PaymentGatewayConfig>
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin
        .from('payment_gateway_config')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('gateway_name', gatewayName)

    if (error) {
        console.error('Error updating gateway:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ============================================
// TOGGLE GATEWAY
// ============================================

export async function togglePaymentGateway(
    gatewayName: string,
    enabled: boolean
): Promise<{ success: boolean; error?: string }> {
    return updatePaymentGateway(gatewayName, { is_enabled: enabled })
}

// ============================================
// SET LIVE MODE
// ============================================

export async function setGatewayLiveMode(
    gatewayName: string,
    isLive: boolean
): Promise<{ success: boolean; error?: string }> {
    return updatePaymentGateway(gatewayName, { is_live_mode: isLive })
}

// ============================================
// UPDATE PUBLIC KEY
// ============================================

export async function updateGatewayPublicKey(
    gatewayName: string,
    publicKey: string
): Promise<{ success: boolean; error?: string }> {
    return updatePaymentGateway(gatewayName, { public_key: publicKey })
}

// ============================================
// UPDATE PLATFORM FEES
// ============================================

export async function updatePlatformFees(
    gatewayName: string,
    feePercent: number,
    feeFixedCents: number
): Promise<{ success: boolean; error?: string }> {
    return updatePaymentGateway(gatewayName, {
        platform_fee_percent: feePercent,
        platform_fee_fixed_cents: feeFixedCents
    })
}

// ============================================
// TEST STRIPE CONNECTION
// ============================================

export async function testStripeConnection(): Promise<{
    success: boolean
    message: string
    accountId?: string
}> {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY

        if (!stripeKey) {
            return {
                success: false,
                message: 'STRIPE_SECRET_KEY no está configurado en variables de entorno'
            }
        }

        // Use fetch to test Stripe API instead of SDK
        const response = await fetch('https://api.stripe.com/v1/account', {
            headers: {
                'Authorization': `Bearer ${stripeKey}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error?.message || 'API error')
        }

        const account = await response.json()

        // Update last tested
        await supabaseAdmin
            .from('payment_gateway_config')
            .update({
                last_tested_at: new Date().toISOString(),
                test_result: 'success'
            })
            .eq('gateway_name', 'stripe')

        return {
            success: true,
            message: `Conexión exitosa. Cuenta: ${account.id}`,
            accountId: account.id
        }
    } catch (error: any) {
        // Update test result
        await supabaseAdmin
            .from('payment_gateway_config')
            .update({
                last_tested_at: new Date().toISOString(),
                test_result: `error: ${error.message}`
            })
            .eq('gateway_name', 'stripe')

        return {
            success: false,
            message: `Error: ${error.message}`
        }
    }
}

// ============================================
// GET ACTIVE GATEWAY FOR CHECKOUT
// ============================================

export async function getActivePaymentGateway(): Promise<{
    gateway: string
    publicKey: string
    config: Record<string, any>
} | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('payment_gateway_config')
        .select('gateway_name, public_key, config')
        .eq('is_enabled', true)
        .single()

    if (error || !data) return null

    return {
        gateway: data.gateway_name,
        publicKey: data.public_key || '',
        config: data.config || {}
    }
}
