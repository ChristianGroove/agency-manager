"use server"

import { revalidatePath } from "next/cache"
import * as BillingService from "./services/billing-service"
import * as PaymentService from "./services/payment-service"
import * as RevenueService from "./services/revenue-service"
import { PlatformBillingService } from "./services/platform-billing-service"
import { validateInvoiceDraft } from "./services/validate-document-action"
import { sendInvoiceEmail } from "./services/send-invoice-email"
import { getAuditLogs as getAuditLogsService } from "./services/get-audit-logs"
import { getFiscalDocuments } from "./services/get-fiscal-documents"
import { Invoice, InvoiceItem } from "@/types"

/**
 * Server Actions for Billing Module
 * Centralized Entry Point for UI & External Modules
 */

// ============================================
// INVOICE ACTIONS
// ============================================

export async function createInvoiceAction(data: any) {
    const result = await BillingService.createInvoice(data)
    if (result.success) revalidatePath('/billing')
    return result
}

export async function getInvoices() {
    return await BillingService.getInvoices()
}

export async function deleteInvoicesAction(ids: string[]) {
    const { createClient } = await import("@/lib/supabase-server")
    const supabase = await createClient()
    const { error } = await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (!error) revalidatePath('/billing')
    return { success: !error, error: error?.message }
}

export async function getInvoiceById(id: string) {
    return await BillingService.getInvoiceById(id)
}

export async function sendInvoiceEmailAction(id: string) {
    return await sendInvoiceEmail(id)
}

export async function getAuditLogsAction(entityId?: string) {
    return await getAuditLogsService(entityId)
}

export async function getPublicInvoiceAction(id: string) {
    return await BillingService.getPublicInvoice(id)
}

export async function getEmittersAction() {
    const { getEmitters } = await import("@/modules/core/settings/emitters-actions")
    try {
        const data = await getEmitters()
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ============================================
// SERVICE ACTIONS
// ============================================

export async function registerServiceAction(data: any) {
    const result = await BillingService.registerService(data)
    if (result.success) revalidatePath('/billing')
    return result
}

export async function toggleServiceStatusAction(id: string, status: 'active' | 'paused' | 'cancelled') {
    const result = await BillingService.toggleServiceStatus(id, status)
    if (result.success) revalidatePath('/billing')
    return result
}

export async function deleteServicesAction(ids: string[]) {
    // Basic common implementation if not specialized
    const { createClient } = await import("@/lib/supabase-server")
    const supabase = await createClient()
    const { error } = await supabase.from('services').delete().in('id', ids)
    if (!error) revalidatePath('/billing')
    return { success: !error, error: error?.message }
}

// ============================================
// PAYMENT ACTIONS
// ============================================

export async function registerPaymentAction(invoiceId: string, amount: number, notes?: string) {
    const result = await PaymentService.registerPayment(invoiceId, amount, notes)
    if (result.success) revalidatePath('/billing')
    return result
}

export async function createSubscriptionPaymentTransactionAction() {
    return await PaymentService.createSubscriptionPaymentTransaction()
}

export async function getSubscriptionHistory() {
    return await PaymentService.getSubscriptionHistory()
}

export async function getPaymentTransactions() {
    return await PaymentService.getPaymentTransactions()
}

// ============================================
// SUBSCRIPTION ACTIONS
// ============================================

export async function getOrganizationSubscription() {
    // This usually matches org logic but exposed here for dashboard
    const { createClient } = await import("@/lib/supabase-server")
    const { getCurrentOrganizationId } = await import("@/modules/core/organizations/actions")
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { data: subscription } = await supabase
        .from('saas_subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .single()

    return subscription
}

// ============================================
// REVENUE & ANALYTICS
// ============================================

export async function getRevenueMetrics() {
    return await RevenueService.getRevenueMetrics()
}

// ============================================
// FISCAL DOCUMENT ACTIONS (DIAN Implementation)
// ============================================

export async function validateInvoiceDraftAction(formData: any) {
    return await validateInvoiceDraft(formData)
}

export async function getFiscalDocumentsAction() {
    return await getFiscalDocuments()
}

// ============================================
// PLATFORM BILLING ACTIONS (SuperAdmin)
// ============================================

export async function createManualPlatformInvoiceAction(data: any) {
    const result = await PlatformBillingService.createManualPlatformInvoice(data)
    if (result.success) {
        revalidatePath('/platform/admin')
    }
    return result
}

export async function getPlatformInvoicesAction(page: number = 1, pageSize: number = 50) {
    return await PlatformBillingService.getPlatformInvoices(page, pageSize)
}

export async function deletePlatformInvoiceAction(invoiceId: string) {
    const result = await PlatformBillingService.deletePlatformInvoice(invoiceId)
    if (result.success) {
        revalidatePath('/platform/admin')
    }
    return result
}

export async function manualActivateSubscriptionAction(organizationId: string, options?: any) {
    const result = await PlatformBillingService.manualActivateSubscription(organizationId, options)
    if (result.success) {
        revalidatePath('/platform/admin')
    }
    return result
}

export async function suspendOrganizationSubscriptionAction(organizationId: string) {
    const result = await PlatformBillingService.suspendOrganizationSubscription(organizationId)
    if (result.success) {
        revalidatePath('/platform/admin')
    }
    return result
}

export async function sendPlatformInvoiceEmailAction(invoiceId: string, recipientEmail: string) {
    return await PlatformBillingService.sendPlatformInvoiceEmail(invoiceId, recipientEmail)
}

export async function getPlatformPaymentMethodsAction() {
    return await PlatformBillingService.getPlatformPaymentMethods()
}
