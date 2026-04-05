import { Lead, Client } from "@/types"

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export type PipelineStage = {
    id: string
    organization_id: string
    pipeline_id: string
    name: string
    status_key: string
    display_order: number
    color: string
    icon: string
    is_active: boolean
    is_final: boolean
}

export type Pipeline = {
    id: string
    organization_id: string
    name: string
    is_default: boolean
    process_enabled: boolean
}

export interface CrmContact extends Lead {
    contact_type: 'lead' | 'client'
}

export type CartItem = {
    id: string
    cart_id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    metadata?: any
}

export type DealCart = {
    id: string
    lead_id: string
    organization_id: string
    items: CartItem[]
    total_amount: number
    status: 'open' | 'converted' | 'abandoned'
}

export interface PaginatedLeadsResponse {
    leads: Lead[]
    totalCount: number
    stageCounts: Record<string, number>
}

export type Tag = {
    id: string
    organization_id: string
    name: string
    color: string
    created_at: string
}

export type LeadTag = Tag & {
    linked_at: string
}

export type Task = {
    id: string
    organization_id: string
    lead_id: string
    title: string
    description?: string
    due_date: string
    status: 'pending' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high'
    assigned_to?: string
    created_at: string
}
