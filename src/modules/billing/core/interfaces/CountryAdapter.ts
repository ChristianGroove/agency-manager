// CountryAdapter Interface - Abstraction for country-specific rules
// Allows extending the system for different jurisdictions

import type { Document, DocumentType } from '../entities/Document'
import type { LineItem } from '../entities/LineItem'
import type { Tax } from '../entities/Tax'
import type { Address, ValidationResult } from '../types/CoreTypes'

/**
 * Country Adapter Interface
 * 
 * Implementations provide country-specific:
 * - Validation rules
 * - Tax calculations
 * - Document number generation
 * - Address formatting
 * - Export formats for fiscal authorities
 */
export interface CountryAdapter {
    /**
     * ISO 3166-1 alpha-2 country code
     */
    readonly countryCode: string

    /**
     * Country name for display
     */
    readonly countryName: string

    /**
     * Validate document according to country rules
     */
    validateDocument(document: Document): Promise<ValidationResult>

    /**
     * Calculate taxes for line items according to country rules
     * 
     * @param lineItems - Items to calculate taxes for
     * @param context - Additional context (issuer type, receiver type, etc.)
     * @returns Array of calculated taxes
     */
    calculateTaxes(
        lineItems: LineItem[],
        context?: TaxCalculationContext
    ): Promise<Tax[]>

    /**
     * Format tax ID according to country standards
     * 
     * @param taxId - Raw tax ID
     * @param type - Type of tax ID (optional)
     * @returns Formatted tax ID
     */
    formatTaxId(taxId: string, type?: string): string

    /**
     * Generate document number according to country requirements
     * 
     * @param type - Document type
     * @param prefix - Optional prefix
     * @param sequence - Optional sequence number
     * @returns Generated document number
     */
    generateDocumentNumber(
        type: DocumentType,
        prefix?: string,
        sequence?: number
    ): Promise<string>

    /**
     * Validate address structure for this country
     */
    validateAddress(address: Address): ValidationResult

    /**
     * Export document in format required by fiscal authority
     * (Optional - only for countries with electronic invoicing)
     */
    exportForAuthority?(document: Document): Promise<AuthorityExport>
}

/**
 * Tax calculation context
 */
export interface TaxCalculationContext {
    issuerType?: string
    receiverType?: string
    documentType?: DocumentType
    date?: Date
    metadata?: Record<string, any>
}

/**
 * Authority export result
 */
export interface AuthorityExport {
    xml?: string
    json?: string
    pdf?: string
    signature?: string
    qrCode?: string
}
