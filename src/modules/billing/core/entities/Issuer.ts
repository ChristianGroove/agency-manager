// Issuer Entity - Entity that issues documents
// Country-agnostic

import type { Address, Metadata, CountryCode } from '../types/CoreTypes'

/**
 * Issuer Type Classification
 */
export enum IssuerType {
    INDIVIDUAL = 'INDIVIDUAL',     // Natural person
    COMPANY = 'COMPANY',           // Legal entity
    GOVERNMENT = 'GOVERNMENT'      // Government entity
}

/**
 * Issuer (entity that issues the document)
 */
export interface Issuer {
    id: string
    type: IssuerType

    // Identification
    legalName: string
    tradeName?: string             // Commercial name
    taxId: string                  // NIT, RUT, EIN, VAT number, etc.
    taxIdType?: string             // Type of tax ID

    // Contact
    address?: Address
    email?: string
    phone?: string
    website?: string

    // Branding
    logo?: string

    // Fiscal configuration (country-specific, stored in metadata)
    fiscalResponsibilities?: string[]  // e.g., ['IVA', 'Renta']
    taxRegime?: string                  // e.g., 'Simplified', 'Common'

    // Extensibility
    metadata?: Metadata
}

/**
 * Factory to create an Issuer
 */
export function createIssuer(params: {
    type: IssuerType
    legalName: string
    taxId: string
    tradeName?: string
    taxIdType?: string
    address?: Address
    email?: string
    phone?: string
    website?: string
    logo?: string
    fiscalResponsibilities?: string[]
    taxRegime?: string
    metadata?: Metadata
}): Issuer {
    return {
        id: crypto.randomUUID(),
        ...params
    }
}
