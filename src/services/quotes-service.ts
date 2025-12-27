import { supabase } from "@/lib/supabase"
import { Quote } from "@/types"

export const QuotesService = {
    async createQuote(quote: Omit<Quote, 'id' | 'created_at' | 'status' | 'number'> & { number?: string }) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // CRITICAL: Get organization context
        const { getCurrentOrganizationId } = await import('@/lib/actions/organizations')
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error('No organization context')

        // Generate number if not provided (simple logic for now, ideally should be auto-increment or fetched)
        let number = quote.number
        if (!number) {
            const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
            number = `COT-${(count || 0) + 1}`.padStart(6, '0')
        }

        const { data, error } = await supabase
            .from('quotes')
            .insert({
                organization_id: orgId,
                ...quote,
                number,
                status: 'draft'
            })
            .select()
            .single()

        if (error) throw error
        return data as Quote
    },

    async updateQuote(id: string, updates: Partial<Quote>) {
        const { data, error } = await supabase
            .from('quotes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as Quote
    },

    async convertQuoteToInvoice(quoteId: string) {
        // 1. Get the quote
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', quoteId)
            .single()

        if (quoteError) throw quoteError
        if (!quote.client_id) throw new Error("La cotización debe estar asignada a un cliente para facturar.")

        // 2. Create the invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                organization_id: quote.organization_id, // CRITICAL: Preserve org context
                client_id: quote.client_id,
                number: quote.number.replace('COT', 'FAC'), // Simple replacement logic
                date: new Date().toISOString(),
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days default
                items: quote.items,
                total: quote.total,
                status: 'pending',
                user_id: quote.user_id
            })
            .select()
            .single()

        if (invoiceError) throw invoiceError

        // 3. Update quote status to accepted
        await this.updateQuote(quoteId, { status: 'accepted' })

        return invoice
    }
}
