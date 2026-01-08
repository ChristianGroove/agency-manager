import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { AIMessage, AIResponse } from '../types';

export class OpenAIProvider extends BaseAIProvider {
    id = 'openai';
    models = ['gpt-4-turbo-preview', 'gpt-3.5-turbo'];

    async generateResponse(
        messages: AIMessage[],
        model: string,
        apiKey: string,
        options?: any
    ): Promise<AIResponse> {
        try {
            const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: false });

            const tools = options?.tools && options.tools.length > 0 ? options.tools : undefined;
            const toolChoice = tools ? (options.tool_choice || 'auto') : undefined;

            const completion = await client.chat.completions.create({
                model: model || 'gpt-3.5-turbo',
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
                provider: 'openai'
            };

        } catch (error) {
            this.handleError(error);
        }
    }
}
