
import { Edge, Node } from '@xyflow/react';

export interface SimulationStep {
    nodeId: string;
    type: string;
    status: 'running' | 'completed' | 'suspended' | 'error';
    output?: any;
    logs: string[];
}

export interface ChatMessage {
    id: string;
    role: 'system' | 'assistant' | 'user';
    content: string;
    timestamp: number;
    metadata?: any; // For buttons, images, etc.
}

export class ClientEngine {
    private nodes: Node[];
    private edges: Edge[];
    private variables: Record<string, any> = {};
    private currentNodeId: string | null = null;
    private history: ChatMessage[] = [];
    private onMessage: (msg: ChatMessage) => void;
    private onStatusChange: (status: 'running' | 'suspended' | 'completed') => void;

    constructor(
        nodes: Node[],
        edges: Edge[],
        initialVariables: Record<string, any>,
        onMessage: (msg: ChatMessage) => void,
        onStatusChange: (status: 'running' | 'suspended' | 'completed') => void
    ) {
        this.nodes = nodes;
        this.edges = edges;
        this.variables = { ...initialVariables };
        this.onMessage = onMessage;
        this.onStatusChange = onStatusChange;
    }

    public async start() {
        // Find trigger
        const trigger = this.nodes.find(n => n.type === 'trigger');
        if (!trigger) {
            this.addSystemMessage('No trigger found.');
            return;
        }

        this.currentNodeId = trigger.id;
        this.onStatusChange('running');
        await this.processNode(trigger);
    }

    public async resume(input: any) {
        if (!this.currentNodeId) return;

        // Log user input
        this.addUserMessage(input.content || JSON.stringify(input));

        // Find next node based on input
        const currentNode = this.nodes.find(n => n.id === this.currentNodeId);
        if (!currentNode) return;

        let nextNodeId: string | undefined;

        // Routing Logic
        if (currentNode.type === 'buttons' || currentNode.type === 'wait_input') {
            const outEdges = this.edges.filter(e => e.source === currentNode.id);

            if (input.buttonId) {
                // Find edge connected to this button handle
                const edge = outEdges.find(e => e.sourceHandle === input.buttonId);
                if (edge) nextNodeId = edge.target;
            }

            // Fallback: finding "continue" or default edge if no specific button edge
            if (!nextNodeId) {
                const defaultEdge = outEdges.find(e => !e.sourceHandle || e.sourceHandle === 'continue');
                if (defaultEdge) nextNodeId = defaultEdge.target;
            }
        }

        if (nextNodeId) {
            const nextNode = this.nodes.find(n => n.id === nextNodeId);
            if (nextNode) {
                await this.processNode(nextNode);
            } else {
                this.onStatusChange('completed');
            }
        } else {
            this.addSystemMessage('Flow ended (No path found).');
            this.onStatusChange('completed');
        }
    }

    private async processNode(node: Node) {
        this.currentNodeId = node.id;

        // Simulate processing delay
        await new Promise(r => setTimeout(r, 600));

        switch (node.type) {
            case 'trigger':
                this.addSystemMessage('Trigger activated.');
                this.moveToNext(node);
                break;

            case 'buttons':
                const data = node.data as any;
                const body = this.replaceVariables(data.body || '');
                const buttons = data.buttons || [];

                this.addBotMessage(body, {
                    type: 'buttons',
                    buttons: buttons
                });

                // Check if we should suspend
                // In simulator, buttons ALWAYs suspend if visible, to let user click
                this.onStatusChange('suspended');
                break;

            case 'wait_input':
                const waitData = node.data as any;
                this.addSystemMessage(`Waiting for input (${waitData.timeout || '1h'})...`);
                this.onStatusChange('suspended');
                break;

            case 'action': // Send Message or other actions
                const actionData = node.data as any;
                if (actionData.actionType === 'send_message') {
                    const msg = this.replaceVariables(actionData.message || '');
                    this.addBotMessage(msg);
                } else {
                    this.addSystemMessage(`Action: ${actionData.actionType}`);
                }
                this.moveToNext(node);
                break;

            case 'tag':
                const tagData = node.data as any;
                this.addSystemMessage(`🏷️ Tag: ${tagData.action === 'remove' ? 'Remove' : 'Add'} '${tagData.tagName}'`);
                this.moveToNext(node);
                break;

            case 'stage':
                const stageData = node.data as any;
                this.addSystemMessage(`📋 Stage changed to: ${stageData.status}`);
                this.moveToNext(node);
                break;

            default:
                this.addSystemMessage(`Processed node: ${node.type}`);
                this.moveToNext(node);
                break;
        }
    }

    private moveToNext(node: Node) {
        // Simple "Next" logic for non-branching nodes
        const edges = this.edges.filter(e => e.source === node.id);
        if (edges.length > 0) {
            // Pick first for now (simulator assumption: linear unless branching node)
            // Ideally we check conditions here too.
            const nextId = edges[0].target;
            const nextNode = this.nodes.find(n => n.id === nextId);
            if (nextNode) {
                this.processNode(nextNode);
            } else {
                this.onStatusChange('completed');
            }
        } else {
            this.onStatusChange('completed');
        }
    }

    private replaceVariables(text: string): string {
        return text.replace(/\{\{(.*?)\}\}/g, (_, key) => {
            const keys = key.trim().split('.');
            let val = this.variables;
            for (const k of keys) {
                val = val?.[k];
            }
            return val !== undefined ? String(val) : `{{${key}}}`;
        });
    }

    private addBotMessage(content: string, metadata?: any) {
        this.onMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content,
            timestamp: Date.now(),
            metadata
        });
    }

    private addUserMessage(content: string) {
        this.onMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now()
        });
    }

    private addSystemMessage(content: string) {
        this.onMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content,
            timestamp: Date.now()
        });
    }
}
