import { WorkflowDefinition, WorkflowNode } from './engine';
import { ContextManager } from './context-manager';

export interface TestExecutionConfig {
    workflowDefinition: WorkflowDefinition;
    testData: Record<string, unknown>;
    dryRun: boolean;
    stepByStep: boolean;
}

export interface TestNodeResult {
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: 'success' | 'error' | 'skipped' | 'running';
    output: unknown;
    context: Record<string, unknown>;
    duration: number;
    timestamp: number;
    error?: string;
    logs: string[];
}

export interface TestExecutionResult {
    success: boolean;
    nodes: TestNodeResult[];
    totalDuration: number;
    error?: string;
}

export class TestExecutor {
    private config: TestExecutionConfig;
    private contextManager: ContextManager;
    private results: TestNodeResult[] = [];
    private currentNodeIndex = 0;
    private logs: string[] = [];

    constructor(config: TestExecutionConfig) {
        this.config = config;
        this.contextManager = new ContextManager();

        // Initialize context with test data
        Object.entries(config.testData).forEach(([key, value]) => {
            this.contextManager.set(key, value);
        });
    }

    async execute(): Promise<TestExecutionResult> {
        const startTime = Date.now();
        this.log('[TestExecutor] Starting workflow execution in test mode');

        try {
            const nodes = this.config.workflowDefinition.nodes;
            const edges = this.config.workflowDefinition.edges;

            // Find trigger node
            const triggerNode = nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                throw new Error('No trigger node found in workflow');
            }

            // Execute from trigger
            await this.executeFromNode(triggerNode.id, nodes, edges);

            const totalDuration = Date.now() - startTime;
            this.log(`[TestExecutor] Execution completed in ${totalDuration}ms`);

            return {
                success: true,
                nodes: this.results,
                totalDuration
            };
        } catch (error) {
            const totalDuration = Date.now() - startTime;
            this.log(`[TestExecutor] Execution failed: ${(error as Error).message}`);

            return {
                success: false,
                nodes: this.results,
                totalDuration,
                error: (error as Error).message
            };
        }
    }

    private async executeFromNode(
        nodeId: string,
        nodes: WorkflowNode[],
        edges: { source: string; target: string }[]
    ): Promise<void> {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
            this.log(`[TestExecutor] Node ${nodeId} not found`);
            return;
        }

        // Execute current node
        const result = await this.executeNode(node);
        this.results.push(result);

        // If error or skipped, stop execution
        if (result.status === 'error') {
            throw new Error(result.error || 'Node execution failed');
        }

        if (result.status === 'skipped') {
            this.log(`[TestExecutor] Node ${node.id} skipped, stopping execution`);
            return;
        }

        // Find next nodes
        const nextEdges = edges.filter(e => e.source === nodeId);

        for (const edge of nextEdges) {
            await this.executeFromNode(edge.target, nodes, edges);
        }
    }

    private async executeNode(node: WorkflowNode): Promise<TestNodeResult> {
        const startTime = Date.now();
        const nodeLabel = (node.data.label as string) || node.type;

        this.log(`[TestExecutor] Executing node: ${nodeLabel} (${node.type})`);

        const result: TestNodeResult = {
            nodeId: node.id,
            nodeLabel,
            nodeType: node.type,
            status: 'running',
            output: null,
            context: { ...this.contextManager.getAll() },
            duration: 0,
            timestamp: Date.now(),
            logs: []
        };

        try {
            // Simulate execution based on node type
            switch (node.type) {
                case 'trigger':
                    result.output = { triggered: true };
                    result.logs.push('Workflow triggered successfully');
                    break;

                case 'action':
                    result.output = await this.executeAction(node);
                    break;

                case 'condition':
                    result.output = await this.executeCondition(node);
                    break;

                case 'crm':
                    result.output = await this.executeCRM(node);
                    break;

                case 'http':
                    result.output = await this.executeHTTP(node);
                    break;

                case 'email':
                    result.output = await this.executeEmail(node);
                    break;

                case 'sms':
                    result.output = await this.executeSMS(node);
                    break;

                default:
                    result.logs.push(`Unknown node type: ${node.type}`);
                    result.output = { skipped: true };
            }

            result.status = 'success';
            result.duration = Date.now() - startTime;
            result.context = { ...this.contextManager.getAll() };
            this.log(`[TestExecutor] Node completed in ${result.duration}ms`);

        } catch (error) {
            result.status = 'error';
            result.error = (error as Error).message;
            result.duration = Date.now() - startTime;
            result.logs.push(`Error: ${result.error}`);
            this.log(`[TestExecutor] Node failed: ${result.error}`);
        }

        return result;
    }

    private async executeAction(node: WorkflowNode): Promise<unknown> {
        const actionType = node.data.actionType as string;
        const message = this.contextManager.resolve((node.data.message as string) || '');

        this.log(`[Action] Type: ${actionType}, Message: ${message}`);

        return {
            actionType,
            message,
            executed: true,
            dryRun: this.config.dryRun
        };
    }

    private async executeCondition(node: WorkflowNode): Promise<unknown> {
        const variable = this.contextManager.resolve((node.data.variable as string) || '');
        const operator = node.data.operator as string;
        const value = this.contextManager.resolve((node.data.value as string) || '');

        const result = this.evaluateCondition(variable, operator, value);
        this.contextManager.set('_lastConditionResult', result);

        this.log(`[Condition] ${variable} ${operator} ${value} = ${result}`);

        return {
            variable,
            operator,
            value,
            result,
            dryRun: this.config.dryRun
        };
    }

    private evaluateCondition(variable: string, operator: string, value: string): boolean {
        switch (operator) {
            case 'equals':
                return variable === value;
            case 'not_equals':
                return variable !== value;
            case 'contains':
                return variable.includes(value);
            default:
                return false;
        }
    }

    private async executeCRM(node: WorkflowNode): Promise<unknown> {
        const actionType = node.data.actionType as string;

        this.log(`[CRM] Action: ${actionType} (DRY RUN - No database changes)`);

        if (actionType === 'create_lead') {
            const leadName = this.contextManager.resolve((node.data.leadName as string) || '');
            const leadEmail = this.contextManager.resolve((node.data.leadEmail as string) || '');

            const mockLeadId = 'test-lead-' + Math.random().toString(36).substring(7);

            this.contextManager.set('leadId', mockLeadId);
            this.contextManager.set('lead', {
                id: mockLeadId,
                name: leadName,
                email: leadEmail
            });

            return {
                action: 'create_lead',
                leadId: mockLeadId,
                leadName,
                leadEmail,
                dryRun: true
            };
        }

        return { action: actionType, dryRun: true };
    }

    private async executeHTTP(node: WorkflowNode): Promise<unknown> {
        const method = node.data.method as string;
        const url = this.contextManager.resolve((node.data.url as string) || '');

        this.log(`[HTTP] ${method} ${url} (DRY RUN - No actual request)`);

        // Mock response
        const mockResponse = {
            status: 200,
            statusText: 'OK',
            data: { mock: true, url, method }
        };

        this.contextManager.set('http_response', mockResponse);

        return {
            method,
            url,
            response: mockResponse,
            dryRun: true
        };
    }

    private async executeEmail(node: WorkflowNode): Promise<unknown> {
        const to = this.contextManager.resolve((node.data.to as string) || '');
        const subject = this.contextManager.resolve((node.data.subject as string) || '');
        const body = this.contextManager.resolve((node.data.body as string) || '');

        this.log(`[Email] To: ${to}, Subject: ${subject} (DRY RUN - No email sent)`);

        const mockEmailId = 'test-email-' + Math.random().toString(36).substring(7);
        this.contextManager.set('emailId', mockEmailId);

        return {
            to,
            subject,
            body: body.substring(0, 50) + '...',
            emailId: mockEmailId,
            dryRun: true
        };
    }

    private async executeSMS(node: WorkflowNode): Promise<unknown> {
        const to = this.contextManager.resolve((node.data.to as string) || '');
        const body = this.contextManager.resolve((node.data.body as string) || '');

        this.log(`[SMS] To: ${to}, Body: ${body} (DRY RUN - No SMS sent)`);

        const mockSmsId = 'test-sms-' + Math.random().toString(36).substring(7);
        this.contextManager.set('smsId', mockSmsId);

        return {
            to,
            body,
            smsId: mockSmsId,
            dryRun: true
        };
    }

    private log(message: string): void {
        this.logs.push(message);
        console.log(message);
    }

    getContext(): Record<string, unknown> {
        return this.contextManager.getAll();
    }

    getLogs(): string[] {
        return this.logs;
    }

    reset(): void {
        this.results = [];
        this.currentNodeIndex = 0;
        this.logs = [];
        this.contextManager = new ContextManager();

        // Re-initialize with test data
        Object.entries(this.config.testData).forEach(([key, value]) => {
            this.contextManager.set(key, value);
        });
    }
}
