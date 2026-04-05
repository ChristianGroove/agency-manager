import { Invoice } from "@/types"

export interface AuditLogEntry {
    id: string
    created_at: string
    actor_id: string
    action: string
    entity_type: string
    entity_id: string
    metadata: any
    actor_email?: string
}

export type FiscalDocumentRow = {
    invoice_id: string
    invoice_number: string
    client_name: string
    issued_at: string
    dian_status: string
    cufe: string | null
    track_id: string | null
    xml_url: string | null
    total: number
}

export interface DocumentBrandingSettings {
    document_primary_color: string
    document_secondary_color: string
    document_logo_url?: string
    document_logo_size: 'small' | 'medium' | 'large'
    document_template_style: 'minimal' | 'modern' | 'classic'
    document_show_watermark: boolean
    document_watermark_text?: string
    document_font_family: string
    document_header_text_color: string
    document_footer_text_color: string
}
