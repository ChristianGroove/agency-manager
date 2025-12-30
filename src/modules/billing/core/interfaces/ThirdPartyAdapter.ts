// ThirdPartyAdapter Interface - Abstraction for external API integrations
// E.g., DIAN (Colombia), SAT (Mexico), fiscal printers, etc.

import type { Document } from '../entities/Document'

/**
 * Third Party Adapter Interface
 * 
 * Implementations connect to external systems:
 * - Fiscal authorities (DIAN, SAT, SII, etc.)
 * - E-invoicing providers
 * - Payment processors
 * - ERP systems
 */
export interface ThirdPartyAdapter {
    /**
     * Provider/service name
     */
    readonly providerName: string

    /**
     * Provider type classification  
     */
    readonly providerType: 'FISCAL_AUTHORITY' | 'EINVOICING_PROVIDER' | 'ERP' | 'OTHER'

    /**
     * Submit document to external system
     * 
     * @param document - Document to submit
     * @returns Submission result with external references
     */
    submitDocument(document: Document): Promise<SubmissionResult>

    /**
     * Query document status from external system
     * 
     * @param externalId - ID in the external system
     * @returns Current status
     */
    getDocumentStatus(externalId: string): Promise<DocumentStatusResponse>

    /**
     * Void/cancel document in external system
     * 
     * @param externalId - ID in the external system
     * @param reason - Reason for voiding
     * @returns Void result
     */
    voidDocument(externalId: string, reason: string): Promise<VoidResult>

    /**
     * Health check / connectivity test
     * 
     * @returns true if service is reachable
     */
    ping(): Promise<boolean>

    /**
     * Get service configuration/limits
     */
    getConfig?(): Promise<ProviderConfig>
}

/**
 * Submission result from external system
 */
export interface SubmissionResult {
    success: boolean

    // External references
    externalId?: string        // ID in external system
    cufe?: string              // Unique code (Colombia DIAN)
    cuf?: string               // Unique code (Bolivia)
    folio?: string             // Folio (Mexico SAT)

    // Response data
    qrCode?: string
    pdfUrl?: string
    xmlUrl?: string

    // Status
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
    message?: string
    errors?: string[]

    // Metadata
    submittedAt?: Date
    metadata?: Record<string, any>
}

/**
 * Document status response from external system
 */
export interface DocumentStatusResponse {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ERROR' | 'UNKNOWN'
    message?: string
    lastUpdated?: Date
    details?: Record<string, any>
}

/**
 * Void operation result
 */
export interface VoidResult {
    success: boolean
    voidedAt?: Date
    externalVoidId?: string
    errors?: string[]
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
    isEnabled: boolean
    rateLimit?: {
        requestsPerMinute: number
        requestsPerDay: number
    }
    features?: string[]
    metadata?: Record<string, any>
}
