// --- Canonical States ---
export type ServiceStatus = 'draft' | 'active' | 'paused' | 'cancelled';
export type CycleStatus = 'future' | 'running' | 'completed' | 'skipped';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'void' | 'cancelled'; // cancelled kept for backward compat

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
    portal_token?: string
    portal_short_token?: string
    invoices?: Invoice[]
    quotes?: Quote[]
    services?: Service[]
    subscriptions?: Service[] // Subscriptions are services of type 'recurring'
    hosting_accounts?: any[] // Todo: Define strict HostingAccount type if needed
    deleted_at?: string
}

export type Service = {
    id: string
    created_at: string
    client_id: string
    name: string
    category: string
    type: 'recurring' | 'one_off'
    frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly'
    base_price: number
    is_visible_in_portal: boolean
    is_catalog_item: boolean // Distinct from "visible", this defines it as a Template/Master
    briefing_template_id?: string
    description?: string
    amount?: number
    quantity?: number
    status?: ServiceStatus
    emitter_id?: string
    document_type?: string
    next_billing_date?: string
    service_start_date?: string
    billing_cycle_start_date?: string
    metadata?: any
    // Cleaning App 2.0 Fields
    duration_minutes?: number
    pricing_model?: 'fixed' | 'hourly' | 'sq_meter'
    worker_count?: number
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
    catalog_item_id?: string
    is_recurring?: boolean
    frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly'
    billing_cycle_config?: any
}

export type Quote = {
    id: string
    created_at: string
    number: string
    title?: string // Friendly name
    date: string
    items: QuoteItem[]
    total: number
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired'
    pdf_url?: string
    client_id?: string | null
    lead_id?: string | null
    client?: Client
    lead?: Lead
    service_id?: string | null
    deleted_at?: string
    emitter_id?: string
    organization_id: string
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
    status: InvoiceStatus
    pdf_url?: string
    client?: Client
    service_id?: string | null
    deleted_at?: string
    emitter_id?: string
    document_type?: string
    is_late_issued?: boolean
    metadata?: any
    cycle_id?: string
    organization_id: string
}

// ... existing types
export type BillingCycle = {
    id: string
    service_id: string
    start_date: string
    end_date: string
    status: CycleStatus
    amount: number
    invoice_id?: string
    invoice?: Invoice
    created_at: string
}

export type ClientEvent = {
    id: string
    created_at: string
    client_id: string
    type: string
    title: string
    description: string
    metadata: any
    icon?: string
}

export type Briefing = {
    id: string
    template_id: string
    client_id?: string
    status: 'draft' | 'sent' | 'in_progress' | 'submitted' | 'locked'
    token: string
    metadata?: any
    created_at: string
    template?: {
        name: string
    }
    service_id?: string | null
}


export type Emitter = {
    id: string
    display_name: string
    legal_name: string
    identification_type: string
    identification_number: string
    verification_digit?: string
    address?: string
    city?: string
    email?: string
    phone?: string
    logo_url?: string
    is_active: boolean
    is_default: boolean
    emitter_type: 'NATURAL' | 'JURIDICO'
    allowed_document_types: string[]
}

export type ServiceCatalogItem = {
    id: string
    name: string
    description?: string
    category: string
    type: 'recurring' | 'one_off'
    frequency?: 'monthly' | 'biweekly' | 'quarterly' | 'semiannual' | 'yearly'
    base_price: number
    is_visible_in_portal: boolean
    created_at?: string
    service_start_date?: string
    billing_cycle_start_date?: string
    briefing_template_id?: string
}
