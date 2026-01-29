
// Phase 9: AI Settings
export interface AiSettings {
    id?: string;
    scope_type: 'global' | 'tenant' | 'space';
    scope_id: string; // 'system' | tenant_id | space_id
    is_voice_enabled: boolean;
    is_clawdbot_enabled: boolean;
    is_personaplex_enabled: boolean;
    daily_token_limit: number;
    monthly_budget_usd: number;
    model_overrides: Record<string, string>;
    updated_at?: string;
}

export type AssistantContext = {
    tenant_id: string
    space_id: string // Maps to Organization ID
    user_id: string
    role: string
    allowed_actions: string[] // List of action names enabled for this context
    active_modules: string[] // e.g. ['crm', 'billing', 'flows']
    vertical?: 'agency' | string // Added for allowed_spaces check
}

export type IntentDefinition = {
    // Identity
    id: string
    name: string // Human readable name
    description: string

    // Governance
    risk_level: 'low' | 'medium' | 'high'
    scope: 'read-only' | 'agency' | 'system'
    allowed_roles: string[] // e.g. ['owner', 'admin', 'member']
    module: 'crm' | 'billing' | 'flows' | 'assistant' | 'general'

    // Execution
    required_parameters: string[]
    allowed_spaces: string[] // e.g. ['agency']
    linked_action?: string
    requires_confirmation: boolean
}

export type AssistantIntent = {
    name: string
    confidence: number
    parameters: Record<string, any>
    raw_input: string
}

export interface AssistantAction {
    name: string
    description: string
    required_permissions: string[]
    schema?: any // Zod schema for validation (future)
    execute: (context: AssistantContext, parameters: any) => Promise<AssistantResult>
}

export type AssistantResult = {
    success: boolean
    narrative_log: string
    data?: any
    metadata?: Record<string, any>
}

export type AssistantInput = {
    text: string
    // Context overriding (optional for simulated tests)
    user_id?: string
    space_id?: string
    input_mode?: 'text' | 'voice' // Phase 5
    voice_metadata?: any
}
