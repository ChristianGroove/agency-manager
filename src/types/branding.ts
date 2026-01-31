export interface BrandingConfig {
    name: string
    logos: {
        main: string | null
        main_light?: string | null // For light mode
        portal: string | null
        favicon: string | null
        dashboard_bg?: string | null
        login_bg?: string | null
    }
    colors: {
        primary: string
        secondary: string
    }
    website?: string
    font_family?: string | null
    login_bg_color?: string | null
    custom_domain?: string | null
    invoice_footer?: string | null
    portal_title?: string | null  // Custom title for client portal

    // Document Specifics
    document_logo_size?: 'small' | 'medium' | 'large'
    document_show_watermark?: boolean
    document_header_text_color?: string | null
    document_footer_text_color?: string | null
    document_font_family?: string | null

    // Contact Information (New for ADN)
    email?: string | null
    phone?: string | null
    address?: string | null

    socials: {
        facebook?: string
        instagram?: string
        twitter?: string
        linkedin?: string
        youtube?: string
    }

    // Operations (Regional & System) - ADN Phase 2
    country?: string | null
    currency?: string | null
    timezone?: string | null
    language?: string | null // App language
    portal_language?: string | null
    date_format?: string | null
    currency_format?: string | null
}
