// ============================================
// REVENUE SHARING TYPES
// ============================================

export type RevenuePhase = 'activation' | 'retention' | 'stable'

export type BillableEventType =
    | 'subscription_base'    // Suscripción mensual/anual base
    | 'subscription_addon'   // Add-on a la suscripción
    | 'addon'               // Compra de add-on independiente
    | 'overage'             // Excedente de uso
    | 'upsell'              // Upgrade de plan
    | 'one_time'            // Cargo único

export type SettlementStatus =
    | 'pending'      // Calculado, esperando aprobación
    | 'approved'     // Aprobado por admin
    | 'processing'   // Enviando a Stripe
    | 'completed'    // Payout exitoso
    | 'failed'       // Error en payout
    | 'cancelled'    // Cancelado manualmente

export type ResellerActivityType =
    | 'addon_sale'
    | 'upsell'
    | 'support_session'
    | 'training'
    | 'consultation'
    | 'onboarding_assist'

// ============================================
// REVENUE SHARE RULES
// ============================================

export interface RevenueShareRule {
    id: string
    reseller_org_id: string | null
    phase_name: RevenuePhase
    phase_start_month: number
    phase_end_month: number | null
    commission_percent: number
    eligible_event_types: BillableEventType[]
    requires_reseller_activity: boolean
    activity_window_days: number
    effective_from: string
    effective_to: string | null
    created_at: string
    created_by: string | null
    updated_at: string
}

// ============================================
// BILLABLE EVENTS
// ============================================

export interface ResellerChainEntry {
    org_id: string
    level: number
}

export interface BillableEvent {
    id: string
    organization_id: string
    reseller_chain: ResellerChainEntry[]
    event_type: BillableEventType
    description: string | null
    amount: number
    currency: string
    invoice_id: string | null
    stripe_payment_intent_id: string | null
    stripe_charge_id: string | null
    client_age_months: number
    settled: boolean
    settlement_id: string | null
    commission_calculated: number | null
    commission_rule_id: string | null
    commission_phase: string | null
    event_date: string
    created_at: string
}

// ============================================
// PAYMENT ACCOUNTS (Stripe Connect)
// ============================================

export interface PaymentAccount {
    id: string
    organization_id: string
    provider: 'stripe_connect'
    stripe_account_id: string | null
    onboarding_complete: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    payout_schedule: 'weekly' | 'monthly'
    minimum_payout_amount: number
    country: string | null
    default_currency: string
    metadata: Record<string, any>
    created_at: string
    updated_at: string
}

// ============================================
// SETTLEMENTS
// ============================================

export interface SettlementBreakdown {
    events: number
    gross: number
    commission: number
}

export interface Settlement {
    id: string
    reseller_org_id: string
    period_start: string
    period_end: string
    gross_revenue: number
    total_commission: number
    platform_fee: number
    net_payout: number
    breakdown: Record<RevenuePhase | string, SettlementBreakdown>
    event_count: number
    status: SettlementStatus
    stripe_payout_id: string | null
    stripe_transfer_id: string | null
    calculated_at: string
    approved_at: string | null
    approved_by: string | null
    paid_at: string | null
    created_at: string
    // Joined
    reseller?: {
        id: string
        name: string
        slug: string
    }
}

// ============================================
// RESELLER ACTIVITY LOG
// ============================================

export interface ResellerActivity {
    id: string
    reseller_org_id: string
    client_org_id: string
    activity_type: ResellerActivityType
    description: string | null
    evidence_url: string | null
    metadata: Record<string, any>
    activity_date: string
    created_at: string
    created_by: string | null
}

// ============================================
// DASHBOARD METRICS
// ============================================

export interface ResellerRevenueMetrics {
    total_clients: number
    total_revenue: number
    total_commission_earned: number
    pending_commission: number
    clients_by_phase: Record<RevenuePhase, number>
}

export interface PlatformRevenueMetrics {
    total_resellers: number
    total_clients: number
    total_gross_revenue: number
    total_platform_revenue: number
    total_reseller_payouts: number
    pending_settlements: number
    pending_payout_amount: number
}

// ============================================
// API RESPONSES
// ============================================

export interface CommissionCalculationResult {
    commission_amount: number
    rule_id: string | null
    phase_name: string
    client_age_months: number
    calculation_note: string
}

export interface CreateBillableEventParams {
    organization_id: string
    event_type: BillableEventType
    amount: number
    description?: string
    currency?: string
    invoice_id?: string
    stripe_payment_intent_id?: string
}

export interface CalculateSettlementParams {
    reseller_org_id: string
    period_start: string // YYYY-MM-DD
    period_end: string   // YYYY-MM-DD
}
