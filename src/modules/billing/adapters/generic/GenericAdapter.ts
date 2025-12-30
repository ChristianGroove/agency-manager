// GenericAdapter - Default country adapter with no specific rules
// Pass-through implementation for PHASE 1

import type {
    CountryAdapter,
    TaxCalculationContext,
    AuthorityExport
} from '../../core/interfaces/CountryAdapter'
import type { Document, DocumentType } from '../../core/entities/Document'
import type { LineItem } from '../../core/entities/LineItem'
import type { Tax } from '../../core/entities/Tax'
import type { Address, ValidationResult } from '../../core/types/CoreTypes'

/**
 * Generic Country Adapter
 * 
 * Default implementation with NO country-specific rules.
 * Used in PHASE 1 to maintain current behavior unchanged.
 * 
 * All validations pass, no tax calculations, simple number generation.
 */
export class GenericAdapter implements CountryAdapter {
    readonly countryCode = 'GENERIC'
    readonly countryName = 'Generic (No specific rules)'

    /**
     * Validate document - always passes in generic mode
     */
    async validateDocument(document: Document): Promise<ValidationResult> {
        // Basic validation only
        const errors: string[] = []

        if (!document.number) {
            errors.push('Document number is required')
        }

        if (!document.issuer) {
            errors.push('Issuer is required')
        }

        if (!document.receiver) {
            errors.push('Receiver is required')
        }

        if (!document.lineItems || document.lineItems.length === 0) {
            errors.push('At least one line item is required')
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        }
    }

    /**
     * Calculate taxes - returns empty array (no automatic tax calculation)
     * 
     * In generic mode, taxes must be provided explicitly.
     * This maintains compatibility with current system where taxes
     * are not automatically calculated.
     */
    async calculateTaxes(
        lineItems: LineItem[],
        context?: TaxCalculationContext
    ): Promise<Tax[]> {
        // No automatic tax calculation in generic mode
        // Taxes must be explicitly provided
        return []
    }

    /**
     * Format tax ID - returns as-is
     */
    formatTaxId(taxId: string, type?: string): string {
        return taxId
    }

    /**
     * Generate document number - simple timestamp-based
     * 
     * Maintains current format: {prefix}{timestamp}-{random}
     */
    async generateDocumentNumber(
        type: DocumentType,
        prefix?: string,
        sequence?: number
    ): Promise<string> {
        const defaultPrefix = prefix || this.getDefaultPrefix(type)
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 5).toUpperCase()

        return `${defaultPrefix}${timestamp}-${random}`
    }

    /**
     * Validate address - always passes
     */
    validateAddress(address: Address): ValidationResult {
        return { isValid: true }
    }

    /**
     * Get default prefix for document type
     */
    private getDefaultPrefix(type: DocumentType): string {
        switch (type) {
            case 'INVOICE':
            case 'RECEIPT':
                return 'INV-'
            case 'CREDIT_NOTE':
                return 'CN-'
            case 'DEBIT_NOTE':
                return 'DN-'
            case 'QUOTE':
                return 'QT-'
            default:
                return 'DOC-'
        }
    }
}
