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

    socials: {
        facebook?: string
        instagram?: string
        twitter?: string
        linkedin?: string
        youtube?: string
    }
}
