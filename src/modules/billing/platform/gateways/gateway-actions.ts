"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"

const PUBLIC_GATEWAY_UPDATE_ERROR = 'No se pudo actualizar la pasarela de pago'
const SENSITIVE_GATEWAY_CONFIG_KEY_PATTERN =
    /(secret|private|password|token|api[_-]?key|access[_-]?key|client[_-]?secret|authorization|bearer|signature|integrity)/i
const PUBLIC_STRIPE_TEST_ERROR = 'No se pudo probar la conexión de Stripe'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeGatewayActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logGatewayActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeGatewayActionError(error))
}

function publicGatewayActionError(publicMessage: string, error: unknown) {
    if (isDeployedRuntime()) return publicMessage
    return error instanceof Error ? error.message : publicMessage
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeGatewayConfig(config: unknown): Record<string, unknown> {
    if (!isPlainObject(config)) return {}

    return Object.entries(config).reduce<Record<string, unknown>>((safeConfig, [key, value]) => {
        if (SENSITIVE_GATEWAY_CONFIG_KEY_PATTERN.test(key)) return safeConfig

        if (Array.isArray(value)) {
            safeConfig[key] = value.map((item) => (
                isPlainObject(item) ? sanitizeGatewayConfig(item) : item
            ))
            return safeConfig
        }

        safeConfig[key] = isPlainObject(value) ? sanitizeGatewayConfig(value) : value
        return safeConfig
    }, {})
}

function sanitizeGatewayForClient(gateway: PaymentGatewayConfig): PaymentGatewayConfig {
    return {
        ...gateway,
        secret_key_ref: null,
        secret_key_ref_present: !!gateway.secret_key_ref,
        config: sanitizeGatewayConfig(gateway.config),
    }
}

function safeGatewayUpdates(updates: Partial<PaymentGatewayConfig>) {
    const safeUpdates: Partial<PaymentGatewayConfig> = {}

    if (typeof updates.is_enabled === 'boolean') safeUpdates.is_enabled = updates.is_enabled
    if (typeof updates.is_live_mode === 'boolean') safeUpdates.is_live_mode = updates.is_live_mode
    if (typeof updates.public_key === 'string' || updates.public_key === null) safeUpdates.public_key = updates.public_key
    if (typeof updates.platform_fee_percent === 'number') safeUpdates.platform_fee_percent = updates.platform_fee_percent
    if (typeof updates.platform_fee_fixed_cents === 'number') safeUpdates.platform_fee_fixed_cents = updates.platform_fee_fixed_cents

    return safeUpdates
}

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
    secret_key_ref_present?: boolean
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
    await requireSuperAdmin()

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('payment_gateway_config')
        .select('*')
        .order('gateway_name')

    if (error) {
        logGatewayActionError('Error fetching payment gateways:', error)
        return []
    }

    return (data as PaymentGatewayConfig[]).map(sanitizeGatewayForClient)
}

// ============================================
// UPDATE GATEWAY CONFIG
// ============================================

export async function updatePaymentGateway(
    gatewayName: string,
    updates: Partial<PaymentGatewayConfig>
): Promise<{ success: boolean; error?: string }> {
    await requireSuperAdmin()

    const allowedUpdates = safeGatewayUpdates(updates)
    if (Object.keys(allowedUpdates).length === 0) {
        return { success: false, error: PUBLIC_GATEWAY_UPDATE_ERROR }
    }

    const { error } = await (await createClient())
        .from('payment_gateway_config')
        .update({
            ...allowedUpdates,
            updated_at: new Date().toISOString()
        })
        .eq('gateway_name', gatewayName)

    if (error) {
        logGatewayActionError('Error updating gateway:', error)
        return { success: false, error: publicGatewayActionError(PUBLIC_GATEWAY_UPDATE_ERROR, error) }
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
    await requireSuperAdmin()

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
        await (await createClient())
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
        logGatewayActionError('Error testing Stripe connection:', error)
        const publicError = publicGatewayActionError(PUBLIC_STRIPE_TEST_ERROR, error)

        // Update test result
        await (await createClient())
            .from('payment_gateway_config')
            .update({
                last_tested_at: new Date().toISOString(),
                test_result: `error: ${publicError}`
            })
            .eq('gateway_name', 'stripe')

        return {
            success: false,
            message: `Error: ${publicError}`
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
        config: sanitizeGatewayConfig(data.config)
    }
}
