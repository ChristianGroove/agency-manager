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

const PUBLIC_EMITTERS_ACTION_ERROR = "No se pudieron cargar los emisores"
const PUBLIC_SETTINGS_ACTION_ERROR = "No se pudo cargar la configuracion"
const PUBLIC_CONTACT_OPTIONS_ERROR = "No se pudieron cargar las opciones de contacto"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function billingActionErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

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
    const result = await BillingService.deleteInvoices(ids)
    if (!result.success) return result
    revalidatePath('/billing')
    return { success: true, error: undefined }
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
    const { getActiveEmitters } = await import("@/modules/core/settings/emitters-actions")
    try {
        const data = await getActiveEmitters()
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: billingActionErrorMessage(e, PUBLIC_EMITTERS_ACTION_ERROR) }
    }
}

export async function getSettingsAction() {
    const { getSettings } = await import("@/modules/core/settings/actions/crud")
    try {
        const data = await getSettings()
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: billingActionErrorMessage(e, PUBLIC_SETTINGS_ACTION_ERROR) }
    }
}

export async function getContactOptionsAction() {
    try {
        const data = await BillingService.getContactOptions()
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: billingActionErrorMessage(e, PUBLIC_CONTACT_OPTIONS_ERROR) }
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
    const result = await BillingService.deleteServices(ids)
    if (!result.success) return result
    revalidatePath('/billing')
    return { success: true, error: undefined }
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
    const { createClient } = await import("@/modules/core/database/supabase-server")
    const { getCurrentOrganizationId } = await import("@/modules/core/organizations/organization-actions")
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

