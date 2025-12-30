
import type { ThirdPartyAdapter, SubmissionResult, DocumentStatusResponse, VoidResult, ProviderConfig } from '../../core/interfaces/ThirdPartyAdapter'
import type { Document } from '../../core/entities/Document'

/**
 * QuickBooks Adapter (STUB)
 * 
 * Demonstrates architectural capability to integrate with Accounting ERPs.
 */
export class QuickBooksAdapter implements ThirdPartyAdapter {
    readonly providerName = 'QuickBooks Online'
    readonly providerType = 'ERP'

    /**
     * Stub: Simulates pushing an invoice to QBO
     */
    async submitDocument(document: Document): Promise<SubmissionResult> {
        console.log(`[QBOStub] Syncing invoice ${document.number} to General Ledger`)

        return {
            success: true,
            externalId: `qbo_inv_${document.number}`,
            status: 'APPROVED', // ERPs usually just accept data
            message: 'Synced to QuickBooks (Stub)',
            metadata: {
                qbo_realm_id: '1234567890',
                deep_link: 'https://qbo.intuit.com/app/invoice?id=123'
            }
        }
    }

    async getDocumentStatus(externalId: string): Promise<DocumentStatusResponse> {
        return {
            status: 'APPROVED',
            message: 'Posted to Ledger',
            lastUpdated: new Date()
        }
    }

    async voidDocument(externalId: string, reason: string): Promise<VoidResult> {
        console.log(`[QBOStub] Voiding invoice ${externalId}`)
        return {
            success: true,
            voidedAt: new Date()
        }
    }

    async ping(): Promise<boolean> {
        return true
    }
}
