
import { ContextManager } from '../context-manager';
// Import AIEngine dynamically to avoid circular deps if any, though straightforward here
import { AIEngine } from '../../ai-engine/service';

export interface AIAgentNodeData {
    systemPrompt?: string;
    userPrompt?: string;
    model?: string;
    temperature?: number;
    outputVar?: string; // Optional: specific variable to store output
}

export class AiAgentNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: AIAgentNodeData, nodeId: string): Promise<string> {
        console.log(`[AiAgentNode] Processing Node: ${nodeId}`);

        const organizationId = this.contextManager.get('organization_id') as string;
        if (!organizationId) {
            throw new Error("[AiAgentNode] Organization ID missing in context");
        }

        const rawUserPrompt = data.userPrompt || '';
        const userPrompt = this.contextManager.resolve(rawUserPrompt);
        const systemPrompt = this.contextManager.resolve(data.systemPrompt || 'You are a helpful assistant.');
        const model = data.model || 'gpt-4o'; // Default to best model

        console.log(`[AiAgentNode] Model: ${model}`);
        console.log(`[AiAgentNode] Prompt: ${userPrompt.substring(0, 50)}...`);

        try {
            // Updated to use the correct task type for the AI Engine
            const response = await AIEngine.executeTask({
                organizationId,
                taskType: 'automation.execute_prompt',
                payload: {
                    prompt: userPrompt,
                    systemPrompt,
                    model
                }
            });

            const output = response.data?.content || response.data?.text || JSON.stringify(response.data);

            console.log(`[AiAgentNode] Output received (${output.length} chars)`);

            // Store in context standard locations
            this.contextManager.set(`ai_${nodeId}`, output);
            this.contextManager.set('ai_last_output', output);

            // Allow storing in specific variable if configured
            if (data.outputVar) {
                this.contextManager.set(data.outputVar, output);
            }

            return output;

        } catch (error: any) {
            console.error(`[AiAgentNode] Error executing AI:`, error);
            throw new Error(`AI Execution Failed: ${error.message}`);
        }
    }
}
