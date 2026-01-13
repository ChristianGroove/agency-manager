export interface ProcessState {
    id: string
    organization_id: string
    type: string // 'sale', 'onboarding', etc.
    key: string // 'discovery', 'checkout'
    name: string
    description?: string
    allowed_next_states: string[]
    is_terminal: boolean
    is_initial: boolean
    metadata: Record<string, any>
    suggested_actions?: Array<{ label: string, action: string, type: 'primary' | 'secondary' }>
    auto_tags?: string[]
    created_at: string
    updated_at: string
}

export interface ProcessInstance {
    id: string
    organization_id: string
    lead_id: string
    type: string
    current_state: string
    status: 'active' | 'paused' | 'completed' | 'cancelled'
    locked: boolean
    context: ProcessContext
    history: ProcessHistoryItem[]
    created_at: string
    updated_at: string
}

export interface ProcessContext {
    intent_score?: number
    cart_value?: number
    last_interaction?: string
    [key: string]: any
}

export interface ProcessHistoryItem {
    from: string
    to: string
    timestamp: string
    actor?: string // 'user', 'automation', 'system'
    reason?: string
}

export interface PipelineProcessMap {
    id: string
    organization_id: string
    pipeline_stage_id: string
    process_type: string
    process_state_key: string
    created_at: string
}

export type ProcessType = 'sale' | 'onboarding' | 'support' | 'advisory'
