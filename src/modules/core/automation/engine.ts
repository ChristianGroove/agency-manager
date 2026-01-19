import { ContextManager } from './context-manager'
import { trackUsage } from '@/modules/core/billing/usage-tracker'
import { CRMNode, CRMNodeData } from './nodes/crm-node'
import { HTTPNode, HTTPNodeData } from './nodes/http-node'
import { EmailNode, EmailNodeData } from './nodes/email-node'
import { SMSNode, SMSNodeData } from './nodes/sms-node'
import { ButtonsNode, ButtonsNodeData } from './nodes/buttons-node'
import { WaitInputNode, WaitInputNodeData } from './nodes/wait-input-node'

import { TagNode, TagNodeData } from './nodes/tag-node'
import { StageNode, StageNodeData } from './nodes/stage-node'
import { ConditionNode, ConditionNodeData } from './nodes/condition-node'
import { DelayNode, DelayNodeData } from './nodes/delay-node'
import { AiAgentNode, AIAgentNodeData } from './nodes/ai-agent-node'
import { SendMessageNode, SendMessageNodeData } from './nodes/send-message-node'
import { ABTestNode, ABTestNodeData } from './nodes/ab-test-node'
import { BillingNode, BillingNodeData } from './nodes/billing-node'
import { NotificationNode, NotificationNodeData } from './nodes/notification-node'
import { VariableNode, VariableNodeData } from './nodes/variable-node'
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
    sourceHandle?: string | null
    targetHandle?: string | null
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
        console.log(`[Engine] Starting workflow execution...`)

        // Find Trigger Node (Assuming single trigger for MVP)
        const triggerNode = this.definition.nodes.find(n => n.type === 'trigger')
        if (!triggerNode) {
            console.error('[Engine] No trigger node found in workflow')
            throw new Error("No trigger node found in workflow")
        }

        console.log(`[Engine] Found trigger node: ${triggerNode.id}`)
        console.log(`[Engine] Total nodes: ${this.definition.nodes.length}, edges: ${this.definition.edges.length}`)

        // Track Usage: automation.execute
        // We assume context has organization_id. If not, we might need to pass it or extract safe.
        // Usually WorkflowEngine is initialized with organization_id in context or has access.
        // Checking constructor... it accepts initialContext.
        const orgId = this.context.organization_id as string
        if (orgId) {
            void trackUsage({
                organizationId: orgId,
                engine: 'automation',
                action: 'automation.execute',
                metadata: {
                    workflow_id: (this.context.workflow as any)?.id // if available
                }
            })
        }

        this.currentStepId = triggerNode.id
        await this.runStep(triggerNode)
        console.log(`[Engine] Workflow execution completed`)
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



    private async logStep(nodeId: string, level: 'info' | 'warn' | 'error', message: string, details?: any): Promise<void> {
        try {
            // Check context keys - executionId might be camelCase or snake_case depending on how it was passed
            const executionId = (this.context.executionId || this.context.execution_id) as string;
            const orgId = (this.context.organization_id || this.context.organizationId) as string;

            if (!executionId || !orgId) return;

            const { supabaseAdmin } = await import('@/lib/supabase-admin');

            await supabaseAdmin.from('workflow_logs').insert({
                organization_id: orgId,
                execution_id: executionId,
                node_id: nodeId,
                level: level,
                message: message,
                details: details ? details : null,
                created_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('[Engine] Failed to log step:', error);
        }
    }

    private async runStep(node: WorkflowNode): Promise<void> {
        console.log(`[Engine] Running Step: ${node.type} (${node.id})`)
        await this.logStep(node.id, 'info', `Running ${node.type}`, { type: node.type });

        // 1. Execute Node Logic
        try {
            await this.executeNodeLogic(node)
        } catch (error: any) {
            console.error(`[Engine] Error in step ${node.id}:`, error)
            await this.logStep(node.id, 'error', `Failed: ${error.message}`, { error: String(error) });

            if (error.message === "WORKFLOW_SUSPENDED") {
                throw error
            }
            return
        }

        // 2. Determine Next Step(s)
        const nextNodes = this.getNextNodes(node)

        if (nextNodes.length === 0) {
            console.log(`[Engine] Workflow Completed or stopped at node ${node.id}`)
            await this.logStep(node.id, 'info', `Completed (End of branch)`);
            return
        }

        // 3. Navigate
        for (const nextNode of nextNodes) {
            this.currentStepId = nextNode.id
            await this.runStep(nextNode)
        }
    }

    public getNextNodes(node: WorkflowNode): WorkflowNode[] {
        const outEdges = this.definition.edges.filter(e => e.source === node.id)
        console.log(`[Engine] getNextNodes for ${node.id}: found ${outEdges.length} outgoing edges`)
        if (outEdges.length > 0) {
            console.log(`[Engine] Edges: ${outEdges.map(e => `${e.source} -> ${e.target}`).join(', ')}`)
        }
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
        else if (node.type === 'buttons') {
            // Check if we have a result from a button click (after suspension)
            const result = this.context._lastInputResult as any

            if (result && result.buttonId) {
                // If we have a button ID, follow the specific handle
                const buttonEdge = outEdges.find(e => e.sourceHandle === result.buttonId)
                if (buttonEdge) {
                    filteredEdges = [buttonEdge]
                } else {
                    // Fallback to 'continue' if specific button path not found
                    filteredEdges = outEdges.filter(e => e.sourceHandle === 'continue')
                }
            } else {
                // No result (pass-through mode) or Fallback
                filteredEdges = outEdges.filter(e => e.sourceHandle === 'continue')
                // If no continue edge, fallback to all (e.g. simple flow)
                if (filteredEdges.length === 0) filteredEdges = outEdges
            }
        }

        else if (node.type === 'wait_input') {
            // WaitInput might have branching based on input!
            const result = this.context._lastInputResult as any
            if (result && result.nextBranchId) {
                filteredEdges = outEdges.filter(e => e.sourceHandle === result.nextBranchId || e.sourceHandle === 'success')
                // Prefer specific branch, fallback to success?
                // Actually logic should be precise.
                const branchEdge = outEdges.find(e => e.sourceHandle === result.nextBranchId)
                if (branchEdge) {
                    filteredEdges = [branchEdge]
                } else {
                    // Fallback to success/default
                    filteredEdges = outEdges.filter(e => e.sourceHandle === 'success')
                }
            } else if (result && result.error) {
                // Error path?
            } else {
                filteredEdges = outEdges.filter(e => e.sourceHandle === 'success' || e.sourceHandle === 'timeout')
                // If we are here, we probably finished waiting.
                // Check if it was a timeout
                if (this.context._lastInputTimeout) {
                    filteredEdges = outEdges.filter(e => e.sourceHandle === 'timeout')
                } else {
                    filteredEdges = outEdges.filter(e => e.sourceHandle === 'success')
                }
            }
        }

        const targetIds = filteredEdges.map(e => e.target)
        return this.definition.nodes.filter(n => targetIds.includes(n.id))
    }

    public async executeNodeLogic(node: WorkflowNode): Promise<void> {
        switch (node.type) {
            case 'trigger':
                // Initial context setup
                break

            case 'billing': {
                const billingNode = new BillingNode(this.contextManager);
                await billingNode.execute(node.data as unknown as BillingNodeData);
                break;
            }

            case 'notification': {
                const notificationNode = new NotificationNode(this.contextManager);
                await notificationNode.execute(node.data as unknown as NotificationNodeData);
                break;
            }

            case 'variable': {
                const variableNode = new VariableNode(this.contextManager);
                variableNode.execute(node.data as unknown as VariableNodeData);
                break;
            }

            case 'action':


                // E.g. Send Message
                if (node.data.actionType === 'send_message') {
                    const sendMessageNode = new SendMessageNode(this.contextManager);
                    await sendMessageNode.execute(node.data as unknown as SendMessageNodeData);
                }
                break

            case 'condition': {
                const conditionNode = new ConditionNode(this.contextManager);
                const result = conditionNode.execute(node.data as unknown as ConditionNodeData);
                this.context._lastConditionResult = result;
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
                const abTestNode = new ABTestNode(this.contextManager);
                const result = abTestNode.execute(node.data as unknown as ABTestNodeData, node.id);
                // Navigation logic uses context variables set by the node
                break;
            }

            case 'delay': {
                const delayNode = new DelayNode();
                const result = delayNode.execute(node.data as unknown as DelayNodeData);

                if (result.suspended) {
                    this.context._suspended = {
                        stepId: node.id,
                        resumeAt: result.resumeAt
                    };
                    console.log(`[Delay] Execution suspended.`)
                    throw new Error("WORKFLOW_SUSPENDED");
                }
                break;
            }

            case 'ai_agent': {
                const aiNode = new AiAgentNode(this.contextManager);
                await aiNode.execute(node.data as unknown as AIAgentNodeData, node.id);
                break;
            }

            case 'buttons': {
                // Check if Resuming
                const pendingInputResponse = this.context._resumedInputResponse as any

                if (pendingInputResponse) {
                    // RESUMED
                    console.log(`[Buttons] Resumed with input:`, pendingInputResponse)

                    const resultObj: any = {
                        userInput: pendingInputResponse.content,
                        buttonId: pendingInputResponse.buttonId
                    }
                    this.context._lastInputResult = resultObj
                    delete this.context._resumedInputResponse
                } else {
                    // EXECUTE NODE (Send Message)
                    const buttonsNode = new ButtonsNode(this.contextManager)
                    const result = await buttonsNode.execute(node.data as unknown as ButtonsNodeData)
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to send buttons')
                    }

                    // CHECK IF WE NEED TO WAIT (Hybrid Mode)
                    // If there are outgoing edges connected to specific buttons, we MUST wait.
                    const outEdges = this.definition.edges.filter(e => e.source === node.id && e.sourceHandle !== 'continue')

                    // Or if explicitly configured to wait
                    const shouldWait = (node.data as any).waitForResponse || outEdges.length > 0

                    if (shouldWait) {
                        const waitNode = new WaitInputNode(this.contextManager)
                        const executionId = this.context.executionId as string
                        const buttonsData = node.data as unknown as ButtonsNodeData

                        // Prepare button options for text matching fallback
                        let buttonOptions: Array<{ id: string, title: string }> = []
                        if (buttonsData.messageType === 'buttons' && buttonsData.buttons) {
                            buttonOptions = buttonsData.buttons.map(b => ({ id: b.id, title: b.title }))
                        } else if (buttonsData.messageType === 'list' && buttonsData.sections) {
                            buttonOptions = buttonsData.sections.flatMap(s => s.rows.map(r => ({ id: r.id, title: r.title })))
                        }

                        // Create implicit configuration for waiting
                        const waitConfig: WaitInputNodeData = {
                            timeout: buttonsData.timeout || '24h',
                            inputType: 'button_click',
                            timeoutAction: buttonsData.timeoutBranchId ? 'branch' : 'continue',
                            timeoutBranchId: buttonsData.timeoutBranchId,
                            buttonOptions,
                            buttonBranches: buttonsData.buttons?.reduce((acc, btn) => {
                                if (btn.branchId) acc[btn.id] = btn.branchId
                                return acc
                            }, {} as Record<string, string>)
                        }

                        const waitResult = await waitNode.startWaiting(waitConfig, executionId, node.id)

                        // STRICT CHECK: If we asked to wait, we MUST suspend unless error
                        if (waitResult.suspended) {
                            console.log(`[Buttons] Workflow suspended waiting for user interaction on buttons.`)
                            throw new Error("WORKFLOW_SUSPENDED")
                        } else if (!waitResult.success) {
                            // If wait failed (e.g. invalid config), log error but maybe don't crash
                            console.error(`[Buttons] Failed to start waiting: ${waitResult.error}`)
                        }
                    }
                }
                break;
            }

            case 'wait_input': {
                const waitNode = new WaitInputNode(this.contextManager)
                // This node is tricky. It usually suspends execution.
                // We need to pass the Execution ID to it.
                const executionId = this.context.executionId as string

                // If we are RESUMING, we should have the input data in context already
                // checking if we are resuming...
                const pendingInputResponse = this.context._resumedInputResponse as any

                if (pendingInputResponse) {
                    // We have resumed! Process the input
                    // Actually, the input processing might happen BEFORE resuming, 
                    // and we just get the result here.
                    // But usually we need to store the result in the context variable requested.

                    const data = node.data as unknown as WaitInputNodeData
                    if (data.storeAs) {
                        this.contextManager.set(data.storeAs, pendingInputResponse)
                    }

                    // Set navigation flags
                    const resultObj: any = {
                        userInput: pendingInputResponse.content,
                        buttonId: pendingInputResponse.buttonId,
                        nextBranchId: pendingInputResponse.nextBranchId
                    }

                    // If it was a button click, we might need to map it again if not done
                    if (data.buttonBranches && pendingInputResponse.buttonId) {
                        resultObj.nextBranchId = data.buttonBranches[pendingInputResponse.buttonId]
                    }

                    this.context._lastInputResult = resultObj

                    // Cleanup
                    delete this.context._resumedInputResponse
                    console.log(`[WaitInput] Resumed with input:`, pendingInputResponse)

                } else {
                    // SUSPEND
                    const result = await waitNode.startWaiting(
                        node.data as unknown as WaitInputNodeData,
                        executionId,
                        node.id
                    )

                    if (result.suspended) {
                        this.context._suspended = {
                            stepId: node.id,
                            reason: 'wait_input'
                        }
                        console.log(`[WaitInput] Execution suspended for input.`)
                        throw new Error("WORKFLOW_SUSPENDED")
                    } else if (!result.success) {
                        throw new Error(result.error)
                    }
                }
                break;
            }


            case 'tag': {
                const tagNode = new TagNode(this.contextManager)
                const result = await tagNode.execute(node.data as unknown as TagNodeData)
                if (!result.success) throw new Error(result.error || 'Failed to update tags')
                break
            }

            case 'stage': {
                const stageNode = new StageNode(this.contextManager)
                const result = await stageNode.execute(node.data as unknown as StageNodeData)
                if (!result.success) throw new Error(result.error || 'Failed to update stage')
                break
            }
        }
    }





    private getNodeById(id: string): WorkflowNode | undefined {
        return this.definition.nodes.find(n => n.id === id)
    }
}
