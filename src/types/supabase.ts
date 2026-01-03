export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            conversations: {
                Row: {
                    id: string
                    organization_id: string
                    lead_id: string | null
                    channel: 'whatsapp' | 'email' | 'sms'
                    status: 'open' | 'closed' | 'snoozed'
                    assigned_to: string | null
                    last_message: string | null
                    last_message_at: string
                    unread_count: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    lead_id?: string | null
                    channel: 'whatsapp' | 'email' | 'sms'
                    status?: 'open' | 'closed' | 'snoozed'
                    assigned_to?: string | null
                    last_message?: string | null
                    last_message_at?: string
                    unread_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    lead_id?: string | null
                    channel?: 'whatsapp' | 'email' | 'sms'
                    status?: 'open' | 'closed' | 'snoozed'
                    assigned_to?: string | null
                    last_message?: string | null
                    last_message_at?: string
                    unread_count?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    conversation_id: string
                    direction: 'inbound' | 'outbound'
                    channel: 'whatsapp' | 'email' | 'sms'
                    content: Json
                    status: 'sent' | 'delivered' | 'read' | 'failed'
                    external_id: string | null
                    sender: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    conversation_id: string
                    direction: 'inbound' | 'outbound'
                    channel: 'whatsapp' | 'email' | 'sms'
                    content?: Json
                    status?: 'sent' | 'delivered' | 'read' | 'failed'
                    external_id?: string | null
                    sender?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    conversation_id?: string
                    direction?: 'inbound' | 'outbound'
                    channel?: 'whatsapp' | 'email' | 'sms'
                    content?: Json
                    status?: 'sent' | 'delivered' | 'read' | 'failed'
                    external_id?: string | null
                    sender?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
            }
            leads: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    organization_id: string
                    title: string
                    status: string
                    pipeline_id: string | null
                    stage_id: string | null
                    priority: string
                    value: number
                    currency: string
                    source: string | null
                    assigned_to: string | null
                    phone: string | null
                    email: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    organization_id?: string
                    title: string
                    status?: string
                    pipeline_id?: string | null
                    stage_id?: string | null
                    priority?: string
                    value?: number
                    currency?: string
                    source?: string | null
                    assigned_to?: string | null
                    phone?: string | null
                    email?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    organization_id?: string
                    title?: string
                    status?: string
                    pipeline_id?: string | null
                    stage_id?: string | null
                    priority?: string
                    value?: number
                    currency?: string
                    source?: string | null
                    assigned_to?: string | null
                    phone?: string | null
                    email?: string | null
                }
            }
            workflows: {
                Row: {
                    id: string
                    name: string
                    organization_id: string
                    is_active: boolean
                    trigger_type: string
                    trigger_config: Json
                    definition: Json
                    created_at: string
                    updated_at: string
                    description: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    organization_id?: string
                    is_active?: boolean
                    trigger_type: string
                    trigger_config?: Json
                    definition?: Json
                    created_at?: string
                    updated_at?: string
                    description?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    organization_id?: string
                    is_active?: boolean
                    trigger_type?: string
                    trigger_config?: Json
                    definition?: Json
                    created_at?: string
                    updated_at?: string
                    description?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
