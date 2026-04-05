"use server"

import { revalidatePath } from "next/cache"
import * as QuotesService from "./services/quotes-service"
import * as ConversionService from "./services/conversion-service"
import { Quote } from "@/types"

/**
 * Server Actions for Quotes Module
 * 
 * This layer acts as the entry point for all UI components.
 * It is responsible for:
 * 1. Invoking the respective service in the Service Layer.
 * 2. Handling framework-level concerns like cache revalidation (Next.js revalidatePath).
 * 3. Managing redirect or navigation logic if needed.
 */

/**
 * Action to create a new quote and revalidate the quotes list.
 */
export async function createQuoteAction(data: Partial<Quote>) {
    const result = await QuotesService.createQuote(data)
    if (result.success) {
        revalidatePath('/quotes')
    }
    return result
}

/**
 * Action to update a quote and revalidate both the list and the specific detail page.
 */
export async function updateQuoteAction(id: string, updates: Partial<Quote>) {
    const result = await QuotesService.updateQuote(id, updates)
    if (result.success) {
        revalidatePath('/quotes')
        revalidatePath(`/quotes/${id}`)
    }
    return result
}

/**
 * Action to delete multiple quotes and revalidate the list.
 */
export async function deleteQuotesAction(ids: string[]) {
    const result = await QuotesService.deleteQuotes(ids)
    if (result.success) {
        revalidatePath('/quotes')
    }
    return result
}

/**
 * Action to duplicate a quote and revalidate the list.
 */
export async function duplicateQuoteAction(id: string) {
    const result = await QuotesService.duplicateQuote(id)
    if (result.success) {
        revalidatePath('/quotes')
    }
    return result
}

/**
 * Action to create a quote from a lead and revalidate the CRM dashboard.
 */
export async function createQuoteFromLeadAction(leadId: string) {
    const result = await QuotesService.createQuoteFromLead(leadId)
    if (result.success) {
        revalidatePath('/crm')
    }
    return result
}

export async function linkQuoteToLeadAction(leadId: string, quoteId: string) {
    const result = await QuotesService.linkQuoteToLead(leadId, quoteId)
    if (result.success) {
        revalidatePath('/crm')
    }
    return result
}

/**
 * Action to convert a quote into services and invoices.
 * Revalidates the quote detail, services list, and invoices list.
 */
export async function convertQuoteAction(quoteId: string) {
    const result = await ConversionService.convertQuote(quoteId)
    if (result.success) {
        revalidatePath(`/quotes/${quoteId}`)
        revalidatePath('/services')
        revalidatePath('/invoices')
    }
    return result
}

/**
 * Action to send a quote via WhatsApp. 
 * This is a pass-through to the service as it doesn't require cache revalidation.
 */
export async function sendQuoteViaWhatsAppAction(quoteId: string, targetPhone?: string) {
    return await QuotesService.sendQuoteViaWhatsApp(quoteId, targetPhone)
}

// Re-export read-only services if needed directly, 
// though usually server components can call QuotesService directly.
export async function getQuote(id: string) {
    return await QuotesService.getQuote(id)
}

export async function getQuotes() {
  return await QuotesService.getQuotes()
}

export async function getPublicQuote(id: string) {
  return await QuotesService.getPublicQuote(id)
}
