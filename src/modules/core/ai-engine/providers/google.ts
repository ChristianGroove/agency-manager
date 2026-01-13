import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAIProvider } from "./base";
import { AIMessage, AIResponse } from "../types";

export class GoogleProvider extends BaseAIProvider {
    id = "google";
    models = ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash"];

    async generateResponse(
        messages: AIMessage[],
        model: string,
        apiKey: string,
        options?: any
    ): Promise<AIResponse> {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);

            // Map common model aliases or use direct model name
            const modelName = model || "gemini-pro";
            const geminiModel = genAI.getGenerativeModel({ model: modelName });

            // Convert messages to Gemini format
            // Gemini history structure: [{ role: "user" | "model", parts: [{ text: "..." }] }]
            const history = messages.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
            }));

            const lastMessage = messages[messages.length - 1];
            const prompt = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

            const chat = geminiModel.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: options?.maxTokens,
                    temperature: options?.temperature,
                }
            });

            const result = await chat.sendMessage(prompt);
            const response = result.response;
            const text = response.text();

            return {
                success: true,
                content: text,
                usage: {
                    // Gemini doesn't always return token usage in the simplified response
                    input_tokens: 0,
                    output_tokens: 0,
                    total_tokens: 0
                },
                model: modelName,
                provider: this.id
            };

        } catch (error: any) {
            this.handleError(error);
        }
    }
}
