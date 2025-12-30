// Invoice Mapper - Bidirectional conversion between Legacy Invoice and Core Document
// CRITICAL: Must maintain exact output compatibility

import type { Invoice, InvoiceItem as LegacyInvoiceItem, Client, Emitter } from '@/types'
import type { Document, DocumentType, DocumentStatus } from '../core/entities/Document'
import type { LineItem } from '../core/entities/LineItem'
import type { Issuer, IssuerType } from '../core/entities/Issuer'
import type { Receiver } from '../core/entities/Receiver'
import type { Totals } from '../core/entities/Totals'
import { calculateTotals } from '../core/entities/Totals'
import { createLineItem } from '../core/entities/LineItem'

/**
 * Invoice Mapper
 * 
 * Converts between:
 * - Legacy Invoice (current system) ↔ Core Document (new architecture)
 * 
 * CRITICAL: Output must be identical to maintain backward compatibility
 */
export class InvoiceMapper {
    /**
     * Convert Legacy Invoice to Core Document
     */
    static legacyToCore(
        invoice: Partial<Invoice> & { items: LegacyInvoiceItem[] },
        organizationId: string,
        userId: string,
        issuer?: Issuer,
        receiver?: Receiver
    ): Omit<Document, 'id' | 'createdAt' | 'audit Log'> {
        // Map status
        const status = this.mapLegacyStatusToCore(invoice.status || 'pending')

        // Map type based on document_type
        const type = this.mapLegacyDocumentType(invoice.document_type)

        // Convert line items
        const lineItems: LineItem[] = invoice.items.map(item =>
            createLineItem({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.price,
                // No taxes at line level in current system
            })
        )

        // Calculate totals
        const totals: Totals = calculateTotals(lineItems)

        // Build document
        return {
            number: invoice.number || '',
            type,
            status,
            issuedAt: invoice.date ? new Date(invoice.date) : new Date(),
            dueDate: invoice.due_date ? new Date(invoice.due_date) : undefined,

            issuer: issuer || this.createPlaceholderIssuer(),
            receiver: receiver || this.createPlaceholderReceiver(),

            lineItems,
            taxes: [], // No document-level taxes in current system
            totals,

            currency: 'COP', // Default for current system
            notes: undefined,
            metadata: {
                legacy_invoice_id: invoice.id,
                is_late_issued: invoice.is_late_issued,
                ...invoice.metadata
            },

            relatedDocuments: {
                serviceId: invoice.service_id || undefined,
                cycleId: invoice.cycle_id || undefined
            },

            organizationId,

            attachments: invoice.pdf_url ? {
                pdf: invoice.pdf_url
            } : undefined,

            createdBy: userId,
            updatedAt: invoice.created_at ? new Date(invoice.created_at) : undefined
        }
    }

    /**
     * Convert Core Document to Legacy Invoice format
     * 
     * CRITICAL: Must produce exact same structure as current system
     */
    static coreToLegacy(document: Document): Partial<Invoice> & { items: LegacyInvoiceItem[] } {
        // Map status back
        const status = this.mapCoreStatusToLegacy(document.status)

        // Map document type back
        const document_type = this.mapCoreDocumentTypeToLegacy(document.type)

        // Convert line items back
        const items: LegacyInvoiceItem[] = document.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.unitPrice
        }))

        // Build legacy invoice
        return {
            id: document.metadata?.legacy_invoice_id || document.id,
            number: document.number,
            date: document.issuedAt.toISOString(),
            due_date: document.dueDate?.toISOString(),
            items,
            total: document.totals.total,
            status,
            document_type,
            pdf_url: document.attachments?.pdf,
            service_id: document.relatedDocuments?.serviceId || null,
            cycle_id: document.relatedDocuments?.cycleId,
            is_late_issued: document.metadata?.is_late_issued,
            metadata: document.metadata,
            organization_id: document.organizationId,
            created_at: document.createdAt.toISOString()
        }
    }

    /**
     * Map legacy status to core status
     */
    private static mapLegacyStatusToCore(status: string): DocumentStatus {
        switch (status) {
            case 'draft':
                return 'DRAFT'
            case 'pending':
                return 'ISSUED'
            case 'paid':
                return 'PAID'
            case 'overdue':
                return 'OVERDUE'
            case 'void':
            case 'cancelled':
                return 'VOIDED'
            default:
                return 'ISSUED'
        }
    }

    /**
     * Map core status back to legacy
     */
    private static mapCoreStatusToLegacy(status: DocumentStatus): string {
        switch (status) {
            case 'DRAFT':
                return 'draft'
            case 'ISSUED':
                return 'pending'
            case 'PAID':
                return 'paid'
            case 'OVERDUE':
                return 'overdue'
            case 'VOIDED':
            case 'CANCELLED':
                return 'void'
            default:
                return 'pending'
        }
    }

    /**
     * Map legacy document_type to core type
     */
    private static mapLegacyDocumentType(docType?: string): DocumentType {
        if (!docType) return 'RECEIPT' // Default to receipt (cuenta de cobro)

        switch (docType) {
            case 'FACTURA_ELECTRONICA':
                return 'INVOICE'
            case 'CUENTA_DE_COBRO':
                return 'RECEIPT'
            case 'COTIZACION':
                return 'QUOTE'
            default:
                return 'RECEIPT'
        }
    }

    /**
     * Map core type back to legacy document_type
     */
    private static mapCoreDocumentTypeToLegacy(type: DocumentType): string {
        switch (type) {
            case 'INVOICE':
                return 'FACTURA_ELECTRONICA'
            case 'RECEIPT':
                return 'CUENTA_DE_COBRO'
            case 'QUOTE':
                return 'COTIZACION'
            case 'CREDIT_NOTE':
            case 'DEBIT_NOTE':
                return 'CUENTA_DE_COBRO' // Fallback
            default:
                return 'CUENTA_DE_COBRO'
        }
    }

    /**
     * Create placeholder issuer (when emitter not provided)
     */
    private static createPlaceholderIssuer(): Issuer {
        return {
            id: 'placeholder',
            type: 'INDIVIDUAL' as IssuerType,
            legalName: 'Placeholder Issuer',
            taxId: '000000000'
        }
    }

    /**
     * Create placeholder receiver (when client not provided)
     */
    private static createPlaceholderReceiver(): Receiver {
        return {
            id: 'placeholder',
            type: 'INDIVIDUAL',
            name: 'Placeholder Receiver'
        }
    }
}
