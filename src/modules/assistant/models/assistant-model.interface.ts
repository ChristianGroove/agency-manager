
export interface AssistantModelInput {
    message: string;
    space_id: string;
    organization_id: string;
    context: {
        userIntent?: string;
        allowedActions: string[];
        knowledgeRefs?: string[];
    };
}

export interface AssistantModelOutput {
    text: string;
    confidence: number;
    suggestedAction?: {
        type: string;
        payload: Record<string, any>;
    };
}

export interface AssistantModel {
    id: string;
    supportsStreaming: boolean;
    supportsVoice: boolean;

    generateResponse(input: AssistantModelInput): Promise<AssistantModelOutput>;
}
