// Totals Entity - Document totals calculator
// Country-agnostic

import type { LineItem } from './LineItem'
import type { Tax } from './Tax'

/**
 * Document totals structure
 */
export interface Totals {
    // Subtotals
    subtotal: number           // Sum of line items before taxes
    discountTotal: number      // Total discounts applied

    // Tax bases
    taxableBase: number        // Base for tax calculation
    taxesTotal: number         // Sum of all taxes (positive)
    withholdingsTotal: number  // Sum of withholdings (negative)

    // Final total
    total: number              // subtotal + taxes - withholdings

    // Additional
    totalInWords?: string      // 'One thousand two hundred dollars'
    roundingAdjustment?: number
}

/**
 * Calculate document totals from line items
 */
export function calculateTotals(lineItems: LineItem[], documentTaxes?: Tax[]): Totals {
    // Calculate subtotals from line items
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
    const discountTotal = lineItems.reduce((sum, item) => {
        const base = item.quantity * item.unitPrice
        return sum + (base - item.subtotal)
    }, 0)

    // Collect all taxes (from line items + document-level)
    const allTaxes: Tax[] = []

    // Line item taxes
    for (const item of lineItems) {
        if (item.taxes) {
            allTaxes.push(...item.taxes)
        }
    }

    // Document-level taxes
    if (documentTaxes) {
        allTaxes.push(...documentTaxes)
    }

    // Separate taxes and withholdings
    const taxesTotal = allTaxes
        .filter(t => !t.isWithholding)
        .reduce((sum, t) => sum + t.amount, 0)

    const withholdingsTotal = allTaxes
        .filter(t => t.isWithholding)
        .reduce((sum, t) => sum + t.amount, 0)

    // Calculate final total
    const total = subtotal + taxesTotal - withholdingsTotal

    return {
        subtotal,
        discountTotal,
        taxableBase: subtotal, // In simple case, taxable base = subtotal
        taxesTotal,
        withholdingsTotal,
        total
    }
}

/**
 * Format number to words (basic implementation)
 * Can be overridden by country adapter for proper localization
 */
export function numberToWords(amount: number, currency: string): string {
    // Basic implementation - country adapters should override
    return `${amount.toFixed(2)} ${currency}`
}
