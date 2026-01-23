/**
 * Placeholder TypeScript types for Meta Graph API
 * 
 * This file will be replaced by auto-generated types from OpenAPI specification.
 * For now, we provide basic types to avoid compilation errors.
 * 
 * To generate types from official Meta OpenAPI spec:
 * 1. Ensure the OpenAPI spec URL is accessible
 * 2. Run: npm run openapi:generate
 */

// Basic placeholder types for Meta API responses
export interface MetaAPIResponse<T = any> {
    data?: T;
    error?: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
    paging?: {
        cursors?: {
            before?: string;
            after?: string;
        };
        next?: string;
        previous?: string;
    };
}

export interface WhatsAppMessage {
    messaging_product: 'whatsapp';
    recipient_type?: 'individual';
    to: string;
    type: 'text' | 'template' | 'interactive' | 'image' | 'video' | 'document' | 'audio';
    text?: {
        body: string;
        preview_url?: boolean;
    };
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: any[];
    };
    interactive?: {
        type: 'button' | 'list' | 'cta_url';
        header?: any;
        body?: {
            text: string;
        };
        footer?: {
            text: string;
        };
        action?: any;
    };
    image?: {
        link?: string;
        id?: string;
        caption?: string;
    };
    video?: {
        link?: string;
        id?: string;
        caption?: string;
    };
    document?: {
        link?: string;
        id?: string;
        caption?: string;
        filename?: string;
    };
    audio?: {
        link?: string;
        id?: string;
    };
}

export interface WhatsAppMessageResponse {
    messaging_product: 'whatsapp';
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

// Note: Run 'npm run openapi:generate' to replace this file with complete types
