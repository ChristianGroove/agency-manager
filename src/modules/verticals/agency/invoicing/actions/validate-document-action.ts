'use server'

import { AIValidatorService } from "@/modules/billing/core/services/AIValidatorService"
import { Document, DocumentType } from "@/modules/billing/core/entities/Document"
import { DocumentStatus } from "@/modules/billing/core/types/CoreTypes"

// Helper to convert form data to Partial<Document>
export async function validateInvoiceDraft(formData: any) {
    // 1. Map generic form data to Core Document structure roughly
    const document: Partial<Document> = {
        type: formData.document_type === 'factura_electronica' ? DocumentType.INVOICE : DocumentType.RECEIPT,
        status: DocumentStatus.DRAFT, // It's a draft being validated
        issuer: {
            fiscalResponsibilities: formData.emitter_responsibilities || [] // We need to pass this context
        } as any,
        receiver: {
            taxId: formData.client_tax_id || '222222222', // Mock if missing to trigger validation
            email: formData.client_email || 'test@example.com'
        } as any,
        lineItems: formData.items || [],
        totals: {
            subtotal: formData.subtotal || 0,
            tax: 0,
            total: formData.total || 0,
            payableAmount: formData.total || 0
        },
        currency: 'COP'
    }

    // 2. Run heuristic validation
    // Note: We are mocking the persistence check since this is pre-save
    const result = await new AIValidatorService().validate(document as Document)

    // 3. Return primitive data (Server Action requirement)
    return JSON.parse(JSON.stringify(result))
}
