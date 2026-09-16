import { BaseAIProvider } from "./base";
import { AIMessage, AIResponse } from "../types";

export class AnthropicProvider extends BaseAIProvider {
    id = "anthropic";
    models = [
        "claude-3-5-sonnet-20240620",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229"
    ];

    async generateResponse(
        messages: AIMessage[],
        model: string,
        apiKey: string,
        options?: any
    ): Promise<AIResponse> {
        try {
            const modelName = model || "claude-3-5-sonnet-20240620";

            // Extract system message if present
            const systemMsg = messages.find(m => m.role === 'system');
            const chatMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                }));

            // Ensure at least one message exists
            if (chatMessages.length === 0 && systemMsg) {
                chatMessages.push({
                    role: 'user',
                    content: typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content)
                });
            }

            const body: any = {
                model: modelName,
                max_tokens: options?.maxTokens || 1024,
                temperature: options?.temperature ?? 0.7,
                messages: chatMessages
            };

            if (systemMsg) {
                body.system = typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content);
            }

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `Anthropic API error: ${response.status} ${response.statusText}`;
                const err = new Error(errorMessage);
                (err as any).status = response.status;
                if (response.status === 429) {
                    (err as any).code = 'QUOTA_EXCEEDED';
                }
                throw err;
            }

            const data = await response.json();
            const textContent = data.content
                ?.filter((block: any) => block.type === 'text')
                ?.map((block: any) => block.text)
                ?.join('') || '';

            return {
                success: true,
                content: textContent,
                usage: {
                    input_tokens: data.usage?.input_tokens || 0,
                    output_tokens: data.usage?.output_tokens || 0,
                    total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
                },
                model: data.model || modelName,
                provider: this.id
            };
        } catch (error: any) {
            this.handleError(error);
        }
    }
}
