
export interface ProcessStateDef {
    key: string
    name: string
    type: 'sale' | 'onboarding' | 'support' | 'custom'
    is_initial: boolean
    is_terminal: boolean
    allowed_next_states: string[]
    metadata: {
        goal: string
        required_fields?: string[]
        [key: string]: any
    }
    suggested_actions?: Array<{
        label: string
        action: string
        type: 'primary' | 'secondary'
    }>
}

export interface PipelineStageDef {
    name: string
    key: string
    mapToProcessKey: string // The strict state key this stage maps to
    color: string
    icon: string
}

export interface CRMTemplate {
    id: string
    name: string
    description: string
    industry: 'agency' | 'clinic' | 'real_estate' | 'legal' | 'consulting' | 'saas' | 'ecommerce' | 'construction' | 'education' | 'event_planning' | 'general'
    processStates: ProcessStateDef[]
    pipelineStages: PipelineStageDef[]
}
