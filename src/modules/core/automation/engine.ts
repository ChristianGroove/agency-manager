import { ContextManager } from './context-manager'
import { CRMNode, CRMNodeData } from './nodes/crm-node'
import { HTTPNode, HTTPNodeData } from './nodes/http-node'
import { EmailNode, EmailNodeData } from './nodes/email-node'
import { SMSNode, SMSNodeData } from './nodes/sms-node'
import { queueWorkflowForResume } from './actions'

export interface WorkflowNode {
    id: string
    type: string // 'trigger', 'action', 'condition', 'delay'
    data: Record<string, unknown>
    position?: { x: number, y: number } // For UI only
}

export interface WorkflowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    label?: string
}

export interface WorkflowDefinition {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}

export interface WorkflowContext {
    [key: string]: unknown
}

export class WorkflowEngine {
    private definition: WorkflowDefinition
    private context: WorkflowContext = {}
    private currentStepId: string | null = null
    private contextManager: ContextManager

    constructor(definition: WorkflowDefinition, initialContext: WorkflowContext = {}) {
        this.definition = definition
        this.context = initialContext
        this.contextManager = new ContextManager(this.context)
    }

    /**
     * Starts execution from the Trigger node.
     */
    async start(): Promise<void> {
        // Find Trigger Node (Assuming single trigger for MVP)
        const triggerNode = this.definition.nodes.find(n => n.type === 'trigger')
        if (!triggerNode) {
            throw new Error("No trigger node found in workflow")
        }

        this.currentStepId = triggerNode.id
        await this.runStep(triggerNode)
    }

    /**
     * Resumes execution from a specific step (e.g., after delay or user input).
     */
    async resume(stepId: string, additionalContext: WorkflowContext = {}): Promise<void> {
        this.context = { ...this.context, ...additionalContext } as WorkflowContext
        this.currentStepId = stepId
        const node = this.getNodeById(stepId)
        if (node) {
            await this.runStep(node)
        }
    }

    private resolveContext(text: string): string {
        return text.replace(/\{\{(.+?)\}\}/g, (_, path) => {
            const keys = path.trim().split('.')
            let value: any = this.context
            for (const key of keys) {
                value = value?.[key]
            }
            return value !== undefined ? String(value) : ''
        })
    }

    private async runStep(node: WorkflowNode): Promise<void> {
        console.log(`[Engine] Running Step: ${node.type} (${node.id})`)

        // 1. Execute Node Logic
        try {
            await this.executeNodeLogic(node)
        } catch (error) {
            console.error(`[Engine] Error in step ${node.id}:`, error)
            return
        }

        // 2. Determine Next Step(s)
        const nextNodes = this.getNextNodes(node)

        if (nextNodes.length === 0) {
            console.log(`[Engine] Workflow Completed or stopped at node ${node.id}`)
            return
        }

        // 3. Navigate
        for (const nextNode of nextNodes) {
            this.currentStepId = nextNode.id
            await this.runStep(nextNode)
        }
    }

    private getNextNodes(node: WorkflowNode): WorkflowNode[] {
        const outEdges = this.definition.edges.filter(e => e.source === node.id)
        let filteredEdges = outEdges

        // Logic Nodes: Filter edges based on result
        if (node.type === 'condition') {
            const result = this.context._lastConditionResult
            // If result is true, follow edge labeled 'True'. Else 'False'.
            const expectedLabel = result ? 'True' : 'False'
            filteredEdges = outEdges.filter(e => e.label === expectedLabel)
            console.log(`[Navigation] Condition: ${result} -> Following edge: ${expectedLabel}`)
        }
        else if (node.type === 'ab_test') {
            const selectedPathId = this.context._lastSplitPathId as string
            // Correctly filter by matching sourceHandle to the selected Path ID
            filteredEdges = outEdges.filter(e => e.sourceHandle === selectedPathId)
            console.log(`[Navigation] AB Split: ${selectedPathId} -> Following edge with handle: ${selectedPathId}`)
        }

        const targetIds = filteredEdges.map(e => e.target)
        return this.definition.nodes.filter(n => targetIds.includes(n.id))
    }

    private async executeNodeLogic(node: WorkflowNode): Promise<void> {
        switch (node.type) {
            case 'trigger':
                // Initial context setup
                break

            case 'action':
                // E.g. Send Message
                if (node.data.actionType === 'send_message') {
                    const messageContent = this.resolveContext((node.data.message as string) || '')
                    console.log(`[Action] Sending Message: ${messageContent}`)
                    // Replace variables in message
                    // Call messaging service
                }
                break

            case 'condition': {
                // Enhanced condition evaluator with multiple conditions and operators
                const conditionData = node.data as {
                    logic?: 'ALL' | 'ANY';
                    conditions?: Array<{
                        variable: string;
                        operator: string;
                        value: string;
                    }>;
                    variable?: string;
                    operator?: string;
                    value?: string;
                };

                const conditions = conditionData.conditions || [{
                    variable: conditionData.variable || '',
                    operator: conditionData.operator || 'equals',
                    value: conditionData.value || ''
                }];

                const logic = conditionData.logic || 'ALL';

                const results = conditions.map(cond => {
                    const resolvedVar = this.resolveContext(`{{${cond.variable}}}`);
                    let result = false;

                    switch (cond.operator) {
                        case '==':
                        case 'equals': result = resolvedVar === cond.value; break;
                        case '!=':
                        case 'not_equals': result = resolvedVar !== cond.value; break;
                        case '>':
                        case 'greater_than': result = Number(resolvedVar) > Number(cond.value); break;
                        case '<':
                        case 'less_than': result = Number(resolvedVar) < Number(cond.value); break;
                        case '>=':
                        case 'greater_equal': result = Number(resolvedVar) >= Number(cond.value); break;
                        case '<=':
                        case 'less_equal': result = Number(resolvedVar) <= Number(cond.value); break;
                        case 'contains': result = String(resolvedVar).includes(cond.value); break;
                        case 'starts_with': result = String(resolvedVar).startsWith(cond.value); break;
                        case 'ends_with': result = String(resolvedVar).endsWith(cond.value); break;
                        default: result = false;
                    }

                    console.log(`[Condition] ${cond.variable} (${resolvedVar}) ${cond.operator} ${cond.value} = ${result}`);
                    return result;
                });

                const finalResult = logic === 'ALL' ? results.every(r => r) : results.some(r => r);
                console.log(`[Condition] Final result (${logic}): ${finalResult}`);
                this.context._lastConditionResult = finalResult;
                break;
            }

            case 'crm': {
                const crmNode = new CRMNode(this.contextManager)
                await crmNode.execute(node.data as unknown as CRMNodeData)
                break
            }

            case 'http': {
                const httpNode = new HTTPNode(node.data as unknown as HTTPNodeData, this.contextManager)
                await httpNode.execute()
                break
            }

            case 'email': {
                const emailNode = new EmailNode(node.data as unknown as EmailNodeData, this.contextManager)
                await emailNode.execute()
                break
            }

            case 'sms': {
                const smsNode = new SMSNode(node.data as unknown as SMSNodeData, this.contextManager)
                await smsNode.execute()
                break
            }

            case 'ab_test': {
                const data = node.data as {
                    paths?: Array<{ id: string; label: string; percentage: number }>;
                };

                // Deterministic Split based on Context ID (e.g. Lead ID)
                // If no specific ID, use Random (fallback)
                const identifier = (this.context.lead as any)?.id ||
                    (this.context.user as any)?.id ||
                    Math.random().toString();

                const hash = this.simpleHash(String(identifier) + node.id);
                const normalized = hash % 100; // 0-99

                let cumulative = 0;
                let selectedPathLabel = '';

                // Defaults
                const paths = data.paths || [
                    { id: 'a', label: 'Path A', percentage: 50 },
                    { id: 'b', label: 'Path B', percentage: 50 }
                ];

                for (const path of paths) {
                    cumulative += path.percentage;
                    if (normalized < cumulative) {
                        selectedPathLabel = path.label; // We match against Edge Label
                        break;
                    }
                }

                // Fallback to last path if rounding errors
                if (!selectedPathLabel && paths.length > 0) {
                    selectedPathLabel = paths[paths.length - 1].label;
                }

                console.log(`[AB-Test] ID: ${identifier} -> Hash: ${normalized} -> Path: ${selectedPathLabel}`);
                this.context._lastSplitPath = selectedPathLabel;
                break;
            }

            case 'delay': {
                // Pause execution
                const duration = String(node.data.duration || '1m'); // Default 1 minute
                console.log(`[Delay] Processing delay: ${duration}`)

                // Parse duration
                let minutes = 1;
                if (duration.endsWith('m')) minutes = parseInt(duration);
                else if (duration.endsWith('h')) minutes = parseInt(duration) * 60;
                else if (duration.endsWith('d')) minutes = parseInt(duration) * 60 * 24;
                else minutes = parseInt(duration) || 1;

                const resumeAt = new Date();
                resumeAt.setMinutes(resumeAt.getMinutes() + minutes);

                console.log(`[Delay] Resuming at: ${resumeAt.toISOString()}`)

                this.context._suspended = {
                    stepId: node.id,
                    resumeAt: resumeAt
                };

                console.log(`[Delay] Execution suspended.`)
                throw new Error("WORKFLOW_SUSPENDED");
            }

            case 'ai_agent': {
                console.log(`[AI-Agent] Processing node ${node.id}`);
                const data = node.data as {
                    systemPrompt?: string;
                    userPrompt?: string;
                    model?: string;
                    temperature?: number;
                };

                const systemPrompt = data.systemPrompt || 'You are a helpful assistant.';
                const userPromptRaw = data.userPrompt || '';
                const userPrompt = this.resolveContext(userPromptRaw);
                const model = data.model || 'gpt-4o';

                console.log(`[AI-Agent] Model: ${model}`);
                console.log(`[AI-Agent] Prompt: ${userPrompt.substring(0, 50)}...`);

                // Call Server Action (Simulated for now directly here or via imported action)
                // Since we cannot easily await an imported server action dynamically without complex setup in this class structure
                // We will simulate the call or assume executeAIAction is available.
                // ideally: const result = await executeAIAction(userPrompt, model, systemPrompt);

                // SIMULATION for MVP
                await new Promise(resolve => setTimeout(resolve, 1000));
                const mockOutput = `[AI Processed] ${userPrompt}`;

                this.context[`ai_${node.id}`] = mockOutput;
                this.context['ai_last_output'] = mockOutput;

                console.log(`[AI-Agent] Output: ${mockOutput}`);
                break;
            }
        }
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }



    private getNodeById(id: string): WorkflowNode | undefined {
        return this.definition.nodes.find(n => n.id === id)
    }
}
