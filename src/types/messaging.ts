export type ChannelType = 'whatsapp' | 'email' | 'messenger' | 'instagram' | 'sms' | 'evolution'
export type ConversationStatus = 'open' | 'closed' | 'archived' | 'snoozed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageContentType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'template'

export interface Conversation {
    id: string
    organization_id: string
    lead_id?: string | null
    client_id?: string | null
    channel: ChannelType
    external_id?: string | null
    status: ConversationStatus
    priority: 'low' | 'medium' | 'high'
    assigned_to?: string | null
    last_message_at: string
    last_message_preview?: string
    unread_count: number
    created_at: string
    updated_at: string
    // Relations (Hydrated)
    lead?: {
        id: string
        name: string
        email?: string
        phone?: string
        company_name?: string
    }
    client?: {
        id: string
        name: string
        email?: string
        phone?: string
        company_name?: string
    }
    assignee?: {
        id: string
        first_name: string
        last_name: string
        email: string
        avatar_url?: string
    }
}

export interface Message {
    id: string
    conversation_id: string
    direction: MessageDirection
    sent_by?: string | null
    content?: string
    content_type: MessageContentType
    media_url?: string
    metadata?: Record<string, unknown>
    status: MessageStatus
    error_message?: string
    created_at: string
    // Relations
    sender?: {
        id: string
        first_name: string
        last_name: string
        email: string
        avatar_url?: string
    }
}

export interface CreateConversationInput {
    lead_id?: string
    client_id?: string
    channel: ChannelType
    external_id?: string
    status?: ConversationStatus
    assigned_to?: string
}

export interface SendMessageInput {
    conversation_id: string
    content: string
    content_type?: MessageContentType
    media_url?: string
    metadata?: Record<string, unknown>
}
