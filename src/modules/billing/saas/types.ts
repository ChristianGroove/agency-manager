/**
 * Billing Module Types
 * Core definitions for platform-level subscriptions and payments.
 */

export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'legacy_manual';

export type PaymentGateway = 'wompi' | 'stripe' | 'manual';

export interface SaasSubscription {
    id: string;
    organization_id: string;
    plan_id: string;
    status: SubscriptionStatus;
    current_period_start: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
    canceled_at?: string;
    trial_start?: string;
    trial_end?: string;
    payment_gateway: PaymentGateway;
    payment_method_id?: string;
    last_payment_at?: string;
    last_payment_error?: Record<string, any>;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface BillingAdapter {
    createSubscription(orgId: string, planId: string): Promise<any>;
    cancelSubscription(subscriptionId: string): Promise<any>;
    handleWebhook(payload: any): Promise<any>;
    syncStatus(subscriptionId: string): Promise<SubscriptionStatus>;
}
