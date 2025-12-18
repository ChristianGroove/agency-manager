export type BriefingStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'locked'

export type BriefingFieldType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'upload'
    | 'scale'
    | 'boolean'

export interface BriefingTemplate {
    id: string
    name: string
    description: string | null
    slug: string
    created_at: string
    updated_at: string
}

export interface BriefingStep {
    id: string
    template_id: string
    title: string
    description: string | null
    order_index: number
    created_at: string
    fields?: BriefingField[]
}

export interface BriefingField {
    id: string
    step_id: string
    label: string
    name: string
    type: BriefingFieldType
    required: boolean
    options: string[] | null // JSONB in DB, array of strings in app
    placeholder: string | null
    help_text: string | null
    order_index: number
    created_at: string
}

export interface Briefing {
    id: string
    template_id: string
    client_id: string | null
    status: BriefingStatus
    token: string
    metadata: Record<string, any> | null
    created_at: string
    updated_at: string
    template?: BriefingTemplate
    client?: {
        id: string
        name: string
        email: string
    }
}

export interface BriefingResponse {
    id: string
    briefing_id: string
    field_id: string
    value: any // JSONB in DB
    created_at: string
    updated_at: string
}

export interface BriefingWithDetails extends Briefing {
    template: BriefingTemplate
    responses: BriefingResponse[]
}

export interface FullBriefingTemplate extends BriefingTemplate {
    steps: (BriefingStep & { fields: BriefingField[] })[]
}
