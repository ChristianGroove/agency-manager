export type AIModelType = 'llm' | 'embedding' | 'vision' | 'audio';

export interface AIProvider {
    id: string; // 'openai', 'anthropic'
    name: string;
    type: AIModelType;
    capabilities: {
        stream: boolean;
        tools: boolean;
        json_mode: boolean;
        vision?: boolean;
    };
    base_url: string;
    models: string[]; // ['gpt-4', 'gpt-3.5-turbo']
}

export interface AICredential {
    id: string;
    organization_id: string;
    provider_id: string;
    api_key_encrypted: string;
    priority: number;
    status: 'active' | 'exhausted' | 'disabled';
    last_used?: Date;
}

export interface AIExecutionOptions {
    taskType: string; // logging tag
    model?: string; // override model preference
    temperature?: number;
    maxTokens?: number;
    startWithProvider?: string; // force specific provider
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[]; // string or array for vision
    tool_calls?: any[];
    name?: string;
}

export interface AIEngineResponse {
    success: boolean;
    data?: any;
    error?: string;
    content?: string; // Legacy support or direct text
    usage?: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
    };
    model?: string;
    provider?: string;
}

// Alias for backwards compatibility with providers
export type AIResponse = AIEngineResponse;
