
import type { ThirdPartyAdapter, SubmissionResult, DocumentStatusResponse, VoidResult, ProviderConfig } from '../../core/interfaces/ThirdPartyAdapter'
import type { Document } from '../../core/entities/Document'

/**
 * Stripe Invoicing Adapter (STUB)
 * 
 * Demonstrates architectural capability to integrate with Global Payment Processors
 * acting as E-invoicing providers.
 */
export class StripeInvoicingAdapter implements ThirdPartyAdapter {
    readonly providerName = 'Stripe'
    readonly providerType = 'EINVOICING_PROVIDER'

    /**
     * Stub: Simulates creating an invoice in Stripe
     */
    async submitDocument(document: Document): Promise<SubmissionResult> {
        console.log(`[StripeStub] Would create invoice for amount ${document.totals.total} ${document.currency}`)

        return {
            success: true,
            externalId: `in_fake_${document.number}`,
            status: 'PENDING',
            message: 'Stripe Invoice created (Stub)',
            metadata: {
                stripe_customer: 'cus_fake_123',
                hosted_invoice_url: 'https://pay.stripe.com/invoice/acct_123/test_inv_xyz'
            }
        }
    }

    async getDocumentStatus(externalId: string): Promise<DocumentStatusResponse> {
        return {
            status: 'APPROVED', // Simulate instant approval usually
            message: 'Payment collection pending',
            lastUpdated: new Date()
        }
    }

    async voidDocument(externalId: string, reason: string): Promise<VoidResult> {
        return {
            success: true,
            voidedAt: new Date(),
            externalVoidId: `${externalId}_void`
        }
    }

    async ping(): Promise<boolean> {
        return true
    }

    async getConfig(): Promise<ProviderConfig> {
        return {
            isEnabled: true,
            features: ['payment_collection', 'automatic_tax'],
            rateLimit: {
                requestsPerMinute: 100,
                requestsPerDay: 10000
            }
        }
    }
}
