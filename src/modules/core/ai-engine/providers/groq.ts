import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { AIMessage, AIResponse } from '../types';

export class GroqProvider extends BaseAIProvider {
    id = 'groq';
    models = [
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'llama3-70b-8192',
        'llama3-8b-8192',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
    ];

    async generateResponse(
        messages: AIMessage[],
        model: string,
        apiKey: string,
        options?: any
    ): Promise<AIResponse> {
        try {
            // Groq uses the OpenAI SDK but with a different base URL
            const client = new OpenAI({
                apiKey,
                baseURL: 'https://api.groq.com/openai/v1',
                dangerouslyAllowBrowser: false
            });

            const tools = options?.tools && options.tools.length > 0 ? options.tools : undefined;
            const toolChoice = tools ? (options.tool_choice || 'auto') : undefined;

            const completion = await client.chat.completions.create({
                model: model || 'llama3-70b-8192',
                messages: messages as any[],
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens,
                tools,
                tool_choice: toolChoice,
                response_format: options?.response_format
            });

            const choice = completion.choices[0];

            return {
                success: true,
                content: choice.message.content || '',
                usage: {
                    input_tokens: completion.usage?.prompt_tokens || 0,
                    output_tokens: completion.usage?.completion_tokens || 0,
                    total_tokens: completion.usage?.total_tokens || 0
                },
                model: completion.model,
                provider: 'groq'
            };

        } catch (error) {
            this.handleError(error);
        }
    }

    // Groq doesn't support embeddings yet in the same way (or maybe they do, but usually people use OpenAI/Cohere for that).
    // Leaving this unimplemented or throwing for now unless requested.
    // BaseAIProvider doesn't mandate createEmbedding (it was just in OpenAI class), checking base.ts...
    // abstract generateResponse is required. createEmbedding is NOT in base.ts abstract methods.
}
