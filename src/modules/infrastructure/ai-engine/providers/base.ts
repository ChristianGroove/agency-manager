import { AIMessage, AIResponse } from '../types';

export abstract class BaseAIProvider {
    abstract id: string;
    abstract models?: string[];

    /**
     * core execution method
     */
    abstract generateResponse(
        messages: AIMessage[],
        model: string,
        apiKey: string,
        options?: any
    ): Promise<AIResponse>;

    /**
     * Mapping generic errors to standard Engine errors
     */
    protected handleError(error: any): never {
        // Simple standardization for now
        const msg = error.message || 'Unknown Provider Error';
        if (msg.includes('429') || msg.includes('quota') || msg.includes('insufficient_quota')) {
            const e = new Error('Quota Exceeded');
            (e as any).code = 'QUOTA_EXCEEDED';
            throw e;
        }
        throw error;
    }
}
