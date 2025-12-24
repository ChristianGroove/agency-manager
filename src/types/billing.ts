
export enum DocumentType {
    CUENTA_DE_COBRO = 'CUENTA_DE_COBRO',
    FACTURA_ELECTRONICA = 'FACTURA_ELECTRONICA', // Future use
    COTIZACION = 'COTIZACION' // Future use
}

export enum InvoiceStatus {
    PENDING = 'pending',
    PAID = 'paid',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled'
}

export interface InvoiceItem {
    description: string
    quantity: number
    price: number
}

export interface Emitter {
    id: string
    display_name: string
    legal_name: string
    emitter_type: 'NATURAL' | 'JURIDICO'
    identification_type: string
    identification_number: string
    verification_digit?: string // Limit to 1 char usually
    allowed_document_types: DocumentType[]
    is_active: boolean
    is_default: boolean
    address?: string
    email?: string
    phone?: string
    logo_url?: string
}

// Centralized Invoice Interface
export interface Invoice {
    id: string
    created_at: string
    client_id: string
    emitter_id?: string // New field
    number: string
    date: string
    due_date?: string
    items: InvoiceItem[]
    total: number
    status: InvoiceStatus
    pdf_url?: string
    document_type: DocumentType

    // UI Helper fields (joined)
    client?: {
        name: string
        email: string
        company_name?: string
        nit?: string
        address?: string
    }

    // Joined emitter
    emitter?: Emitter
}
