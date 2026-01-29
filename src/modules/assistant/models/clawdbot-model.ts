import { AssistantModel, AssistantModelInput, AssistantModelOutput } from "./assistant-model.interface";
import { clawdbotClient, ClawdbotMessage } from "../clients/clawdbot.client";
import { rateLimiter } from "./rate-limiter";
import { SYSTEM_INTENTS } from "../intent-registry";
import { AIEngine } from "@/modules/core/ai-engine/service";
import { MockAssistantModel } from "./mock-model";

export class ClawdbotAssistantModel implements AssistantModel {
    id = "clawdbot-v1";
    supportsStreaming = false;
    supportsVoice = false;

    async generateResponse(input: AssistantModelInput): Promise<AssistantModelOutput> {
        // 1. Rate Limit Check
        if (!rateLimiter.checkLimit(input.space_id)) {
            return {
                text: "Has alcanzado el límite diario de consultas inteligentes para este espacio.",
                confidence: 0
            };
        }

        try {
            console.log(`[ClawdBot] Delegating to AIEngine (Task: assistant.operational_v1)...`);

            // 2. Execute Real AI Task with Strict Timeout
            const MAX_EXECUTION_TIME_MS = 10000; // 10s Hard Limit

            const aiPromise = AIEngine.executeTask({
                organizationId: input.organization_id || 'system',
                taskType: 'assistant.operational_v1',
                payload: {
                    message: input.message,
                    space_id: input.space_id,
                    allowedActions: input.context.allowedActions,
                    userIntent: input.context.userIntent
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT_EXCEEDED")), MAX_EXECUTION_TIME_MS)
            );

            // Race: AI vs Timer
            const result: any = await Promise.race([aiPromise, timeoutPromise]);

            // 3. Parse Result
            const data = result.data; // { message, suggested_action? }

            return {
                text: data.message || "...",
                confidence: 0.99, // High confidence if AI succeeded
                suggestedAction: data.suggested_action
            };

        } catch (e: any) {
            console.warn(`[ClawdBot] AI Engine failed (likely no API Key). Falling back to Mock. Error: ${e.message}`);

            // 4. Fallback to Mock
            const mock = new MockAssistantModel();
            return mock.generateResponse(input);
        }
    }
}
