export type Client = {
    id: string
    created_at: string
    user_id: string
    name: string
    company_name?: string
    nit?: string
    email?: string
    phone?: string
    address?: string
    logo_url?: string
}

export type Lead = {
    id: string
    created_at: string
    user_id: string
    name: string
    company_name?: string
    email?: string
    phone?: string
    status: 'open' | 'converted' | 'lost'
    notes?: string
}

export type QuoteItem = {
    description: string
    quantity: number
    price: number
}

export type Quote = {
    id: string
    created_at: string
    number: string
    date: string
    items: QuoteItem[]
    total: number
    status: 'draft' | 'sent' | 'accepted' | 'rejected'
    pdf_url?: string
    client_id?: string | null
    lead_id?: string | null
    client?: Client
    lead?: Lead
}

export type InvoiceItem = {
    description: string
    quantity: number
    price: number
}

export type Invoice = {
    id: string
    created_at: string
    client_id: string
    number: string
    date: string
    due_date?: string
    items: InvoiceItem[]
    total: number
    status: 'pending' | 'paid' | 'overdue' | 'cancelled'
    pdf_url?: string
    client?: Client
}
