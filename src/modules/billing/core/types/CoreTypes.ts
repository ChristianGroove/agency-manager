// Core Types - Shared type definitions for Billing Core
// Independent of country/jurisdiction

/**
 * ISO 4217 Currency Code
 */
export type CurrencyCode = string // 'USD' | 'COP' | 'MXN' | etc.

/**
 * ISO 3166-1 alpha-2 Country Code
 */
export type CountryCode = string // 'CO' | 'US' | 'MX' | etc.

/**
 * Generic Address structure
 */
export interface Address {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country: CountryCode
}

export enum DocumentStatus {
    DRAFT = 'draft',
    ISSUED = 'issued',
    SENT = 'sent',
    VALIDATED = 'validated',
    REJECTED = 'rejected',
    EXTERNAL = 'external',
    CANCELLED = 'cancelled',
    CONTINGENCY = 'contingency'
}

export enum PaymentStatus {
    UNPAID = 'UNPAID',
    PAID = 'PAID',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    OVERDUE = 'OVERDUE'
}

/**
 * Metadata container for extensibility
 */
export type Metadata = Record<string, any>

/**
 * Validation result structure
 */
export interface ValidationResult {
    isValid: boolean
    errors?: string[]
    warnings?: string[]
}

/**
 * Money amount representation
 */
export interface MoneyAmount {
    amount: number
    currency: CurrencyCode
}
