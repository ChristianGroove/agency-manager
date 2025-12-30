// Document Entity - Core billing document
// Country-agnostic, extensible

import type { Issuer } from './Issuer'
import type { Receiver } from './Receiver'
import type { LineItem } from './LineItem'
import type { Tax } from './Tax'
import type { Totals } from './Totals'
import type { CurrencyCode, Metadata } from '../types/CoreTypes'

/**
 * Document Type Classification
 */
export enum DocumentType {
    INVOICE = 'INVOICE',           // Generic invoice
    CREDIT_NOTE = 'CREDIT_NOTE',   // Credit note
    DEBIT_NOTE = 'DEBIT_NOTE',     // Debit note
    RECEIPT = 'RECEIPT',           // Receipt / Cuenta de cobro
    QUOTE = 'QUOTE'                // Quotation
}

/**
 * Document Status
 */
export enum DocumentStatus {
    DRAFT = 'DRAFT',         // Borrador (not used in current system)
    ISSUED = 'ISSUED',       // Emitido (maps to 'pending')
    PAID = 'PAID',           // Pagado
    OVERDUE = 'OVERDUE',     // Vencido
    VOIDED = 'VOIDED',       // Anulado  
    CANCELLED = 'CANCELLED'  // Cancelado (legacy)
}

/**
 * Core Document Entity
 * 
 * Represents any billing document in a country-agnostic way.
 * Country-specific details go in metadata.
 */
export interface Document {
    // Identification
    id: string
    number: string
    type: DocumentType
    status: DocumentStatus

    // Dates
    issuedAt: Date
    dueDate?: Date
    paidAt?: Date
    voidedAt?: Date

    // Parties
    issuer: Issuer
    receiver: Receiver

    // Content
    lineItems: LineItem[]
    taxes: Tax[]               // Document-level taxes
    totals: Totals

    // Metadata
    currency: CurrencyCode
    exchangeRate?: number
    notes?: string
    metadata?: Metadata

    // Relationships (optional)
    relatedDocuments?: {
        serviceId?: string
        cycleId?: string
        parentDocumentId?: string  // For credit/debit notes
    }

    // Organizational context (multitenant)
    organizationId: string

    // Attachments
    attachments?: {
        pdf?: string
        xml?: string
        json?: string
    }

    // Audit trail
    createdAt: Date
    createdBy: string
    updatedAt?: Date
    updatedBy?: string
    auditLog: string[]  // Array of AuditLog entry IDs
}

/**
 * Factory to create a Document
 */
export function createDocument(params: {
    number: string
    type: DocumentType
    status: DocumentStatus
    issuedAt: Date
    issuer: Issuer
    receiver: Receiver
    lineItems: LineItem[]
    totals: Totals
    organizationId: string
    createdBy: string
    dueDate?: Date
    currency?: CurrencyCode
    taxes?: Tax[]
    notes?: string
    metadata?: Metadata
    relatedDocuments?: Document['relatedDocuments']
}): Document {
    return {
        id: crypto.randomUUID(),
        number: params.number,
        type: params.type,
        status: params.status,
        issuedAt: params.issuedAt,
        dueDate: params.dueDate,
        issuer: params.issuer,
        receiver: params.receiver,
        lineItems: params.lineItems,
        taxes: params.taxes || [],
        totals: params.totals,
        currency: params.currency || 'USD',
        notes: params.notes,
        metadata: params.metadata,
        relatedDocuments: params.relatedDocuments,
        organizationId: params.organizationId,
        createdAt: new Date(),
        createdBy: params.createdBy,
        auditLog: []
    }
}
