// LineItem Entity - Individual line in a document
// Country-agnostic

import type { Tax } from './Tax'
import type { Metadata } from '../types/CoreTypes'

/**
 * Line Item in a billing document
 */
export interface LineItem {
    id: string

    // Description
    description: string
    code?: string              // SKU, product code, service code

    // Quantities
    quantity: number
    unitPrice: number
    discount?: number
    discountType?: 'AMOUNT' | 'PERCENTAGE'

    // Calculated
    subtotal: number           // quantity * unitPrice - discount

    // Taxes applicable to this line
    taxes?: Tax[]

    // Total including taxes
    total: number

    // Additional info
    unit?: string              // 'unit', 'hour', 'kg', etc.
    category?: string
    metadata?: Metadata
}

/**
 * Calculate line item subtotal
 */
export function calculateLineSubtotal(
    quantity: number,
    unitPrice: number,
    discount?: number,
    discountType?: 'AMOUNT' | 'PERCENTAGE'
): number {
    const base = quantity * unitPrice

    if (!discount) return base

    if (discountType === 'PERCENTAGE') {
        return base * (1 - discount / 100)
    }

    return base - discount
}

/**
 * Calculate line item total (subtotal + taxes)
 */
export function calculateLineTotal(lineItem: LineItem): number {
    let total = lineItem.subtotal

    if (lineItem.taxes) {
        for (const tax of lineItem.taxes) {
            if (tax.isWithholding) {
                total -= tax.amount
            } else {
                total += tax.amount
            }
        }
    }

    return total
}

/**
 * Factory function to create a LineItem
 */
export function createLineItem(params: {
    description: string
    quantity: number
    unitPrice: number
    discount?: number
    discountType?: 'AMOUNT' | 'PERCENTAGE'
    code?: string
    unit?: string
    category?: string
    taxes?: Tax[]
    metadata?: Metadata
}): LineItem {
    const subtotal = calculateLineSubtotal(
        params.quantity,
        params.unitPrice,
        params.discount,
        params.discountType
    )

    const lineItem: LineItem = {
        id: crypto.randomUUID(),
        description: params.description,
        code: params.code,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        discount: params.discount,
        discountType: params.discountType,
        subtotal,
        taxes: params.taxes,
        total: 0, // Will be calculated
        unit: params.unit,
        category: params.category,
        metadata: params.metadata
    }

    lineItem.total = calculateLineTotal(lineItem)

    return lineItem
}
