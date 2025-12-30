
import type { ThirdPartyAdapter, SubmissionResult, DocumentStatusResponse, VoidResult } from '../../core/interfaces/ThirdPartyAdapter'
import type { Document } from '../../core/entities/Document'

/**
 * Xero Adapter (STUB)
 * 
 * Another example of ERP integration.
 */
export class XeroAdapter implements ThirdPartyAdapter {
    readonly providerName = 'Xero'
    readonly providerType = 'ERP'

    async submitDocument(document: Document): Promise<SubmissionResult> {
        console.log(`[XeroStub] Posting invoice ${document.number}`)

        return {
            success: true,
            externalId: `xero_${document.number}`,
            status: 'APPROVED',
            message: 'Posted to Xero (Stub)'
        }
    }

    async getDocumentStatus(externalId: string): Promise<DocumentStatusResponse> {
        return {
            status: 'APPROVED',
            message: 'OK',
            lastUpdated: new Date()
        }
    }

    async voidDocument(externalId: string, reason: string): Promise<VoidResult> {
        return {
            success: true,
            voidedAt: new Date()
        }
    }

    async ping(): Promise<boolean> {
        return true
    }
}
