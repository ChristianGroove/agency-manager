// Tax Entity - Abstract representation of taxes
// Country-agnostic, extensible via metadata

import type { Metadata } from '../types/CoreTypes'

/**
 * Tax Type Classification
 */
export enum TaxType {
    VALUE_ADDED = 'VALUE_ADDED',       // IVA, GST, VAT
    SALES = 'SALES',                   // Sales Tax
    WITHHOLDING = 'WITHHOLDING',       // Retención en la fuente
    EXCISE = 'EXCISE',                 // Impuesto al consumo
    MUNICIPAL = 'MUNICIPAL',           // ICA, local taxes
    OTHER = 'OTHER'
}

/**
 * Tax representation
 * 
 * Represents any tax applicable to a document or line item.
 * Country-specific details go in metadata.
 */
export interface Tax {
    id: string
    type: TaxType
    name: string               // Human-readable: 'IVA 19%', 'Withholding 2.5%'

    // Calculation
    rate: number               // Percentage (0-100)
    base: number               // Taxable base
    amount: number             // Calculated amount (base * rate / 100)

    // Classification
    isWithholding: boolean     // true if deducted from total
    isDeductible: boolean      // true if tax-deductible

    // Country-specific reference
    taxCode?: string           // Local tax code/classification

    // Extensibility
    metadata?: Metadata
}

/**
 * Factory function to create a Tax
 */
export function createTax(params: {
    type: TaxType
    name: string
    rate: number
    base: number
    isWithholding?: boolean
    isDeductible?: boolean
    taxCode?: string
    metadata?: Metadata
}): Tax {
    const amount = (params.base * params.rate) / 100

    return {
        id: crypto.randomUUID(),
        type: params.type,
        name: params.name,
        rate: params.rate,
        base: params.base,
        amount,
        isWithholding: params.isWithholding ?? false,
        isDeductible: params.isDeductible ?? false,
        taxCode: params.taxCode,
        metadata: params.metadata
    }
}
