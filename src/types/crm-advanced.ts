// ============================================
// CRM Advanced Types
// ============================================

import { Database } from '@/types/supabase'

// Enhanced Lead with new fields
export interface Lead {
    id: string
    organization_id: string
    name: string
    company_name?: string
    email?: string
    phone?: string
    status: string
    user_id: string
    notes?: string
    tags?: string[]
    source?: string
    assigned_to?: string
    last_contact_at?: string
    next_follow_up_at?: string
    score?: number
    score_factors?: ScoreFactors
    last_scored_at?: string
    estimated_value?: number
    created_at: string
    updated_at?: string
}

// Lead Score Factors
export interface ScoreFactors {
    hasEmail: boolean
    hasPhone: boolean
    hasCompany: boolean
    emailDomain: 'personal' | 'business' | 'unknown'
    responseTime?: number // in hours
    engagement?: number
    pipelineProgress: number
    estimatedValue?: number
    source?: string
}

// Lead Activity
export interface LeadActivity {
    id: string
    organization_id: string
    lead_id: string
    activity_type: ActivityType
    description: string
    metadata?: Record<string, any>
    performed_by?: string
    performed_by_user?: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
    created_at: string
}

export type ActivityType =
    | 'status_change'
    | 'assigned'
    | 'unassigned'
    | 'note_added'
    | 'email_sent'
    | 'email_received'
    | 'call_made'
    | 'call_received'
    | 'meeting_scheduled'
    | 'meeting_completed'
    | 'task_created'
    | 'task_completed'
    | 'document_uploaded'
    | 'converted'
    | 'score_updated'
    | 'tag_added'
    | 'tag_removed'
    | 'created'

// Lead Assignment
export interface LeadAssignment {
    id: string
    organization_id: string
    lead_id: string
    assigned_to?: string
    assigned_by?: string
    assigned_at: string
    notes?: string
    assignee?: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
}

// Lead Task
export interface LeadTask {
    id: string
    organization_id: string
    lead_id?: string
    title: string
    description?: string
    task_type: TaskType
    status: TaskStatus
    priority: TaskPriority
    due_date?: string
    assigned_to?: string
    created_by?: string
    completed_at?: string
    completed_by?: string
    created_at: string
    updated_at: string
    // Relations
    lead?: Lead
    assignee?: {
        id: string
        email: string
        full_name?: string
    }
}

export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'custom'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// Lead Note
export interface LeadNote {
    id: string
    organization_id: string
    lead_id: string
    content: string
    note_type: NoteType
    is_pinned: boolean
    created_by?: string
    created_at: string
    updated_at: string
    // Relations
    author?: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
}

export type NoteType = 'general' | 'call' | 'meeting' | 'email'

// Lead Email
export interface LeadEmail {
    id: string
    organization_id: string
    lead_id?: string
    direction: 'inbound' | 'outbound'
    from_email?: string
    to_email?: string
    cc_emails?: string[]
    subject?: string
    body_text?: string
    body_html?: string
    status: EmailStatus
    sent_at?: string
    delivered_at?: string
    opened_at?: string
    clicked_at?: string
    bounced_at?: string
    metadata?: Record<string, any>
    created_at: string
}

export type EmailStatus = 'draft' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

// Lead Document
export interface LeadDocument {
    id: string
    organization_id: string
    lead_id: string
    file_name: string
    file_url: string
    file_type?: string
    file_size?: number
    uploaded_by?: string
    created_at: string
    // Relations
    uploader?: {
        id: string
        email: string
        full_name?: string
    }
}

// ============================================
// Form Data Types
// ============================================

export interface CreateLeadTaskInput {
    lead_id?: string
    title: string
    description?: string
    task_type: TaskType
    priority: TaskPriority
    due_date?: string
    assigned_to?: string
}

export interface UpdateLeadTaskInput {
    title?: string
    description?: string
    task_type?: TaskType
    status?: TaskStatus
    priority?: TaskPriority
    due_date?: string
    assigned_to?: string
}

export interface CreateLeadNoteInput {
    lead_id: string
    content: string
    note_type: NoteType
    is_pinned?: boolean
}

export interface SendEmailInput {
    lead_id: string
    to_email: string
    cc_emails?: string[]
    subject: string
    body_html: string
    body_text?: string
}

export interface AssignLeadInput {
    lead_ids: string[]
    assigned_to: string | null
    notes?: string
}

export interface UpdateLeadInput {
    name?: string
    company_name?: string
    email?: string
    phone?: string
    status?: string
    notes?: string
    tags?: string[]
    source?: string
    assigned_to?: string
    next_follow_up_at?: string
    estimated_value?: number
}

// ============================================
// Response Types
// ============================================

export interface LeadWithRelations extends Lead {
    activities?: LeadActivity[]
    tasks?: LeadTask[]
    note_entries?: LeadNote[]
    emails?: LeadEmail[]
    documents?: LeadDocument[]
    assignments?: LeadAssignment[]
    assignee?: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
}

// ============================================
// Analytics Types
// ============================================

export interface LeadScoreTier {
    name: string
    min: number
    max: number
    color: string
    icon: string
}

export const SCORE_TIERS: LeadScoreTier[] = [
    { name: 'Cold Lead', min: 0, max: 30, color: 'red', icon: '❄️' },
    { name: 'Warm Lead', min: 31, max: 60, color: 'yellow', icon: '🌤️' },
    { name: 'Hot Lead', min: 61, max: 80, color: 'green', icon: '🔥' },
    { name: 'Very Hot Lead', min: 81, max: 100, color: 'purple', icon: '⚡' },
]

export function getScoreTier(score: number): LeadScoreTier {
    return SCORE_TIERS.find(tier => score >= tier.min && score <= tier.max) || SCORE_TIERS[0]
}
