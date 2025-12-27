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
    | 'color'
    | 'typography'

export interface BriefingTemplate {
    id: string
    name: string
    description: string | null
    slug: string
    structure: BriefingField[] // JSONB
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
    // step_id: string // Deprecated
    label: string
    // name: string // Deprecated, use id or label slug
    type: BriefingFieldType
    required: boolean
    options: string[] | null
    placeholder?: string | null
    help_text?: string | null
    // order_index: number // Implicit in array order
    step_title?: string // Optional for grouping
    step_description?: string // Optional description for the step
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
    service_id?: string | null
    deleted_at?: string
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

export type FullBriefingTemplate = BriefingTemplate
