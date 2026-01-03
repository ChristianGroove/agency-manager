import { NextRequest, NextResponse } from 'next/server';
import { AIWorkflowAnalyzer, WorkflowContext } from '@/modules/core/automation/ai-analyzer';
import { WorkflowNode, WorkflowEdge } from '@/modules/core/automation/engine';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nodes, edges } = body as {
            nodes: WorkflowNode[];
            edges: WorkflowEdge[];
        };

        if (!nodes) {
            return NextResponse.json(
                { error: 'Nodes array is required' },
                { status: 400 }
            );
        }

        // Extract variables from nodes
        const variables = extractVariables(nodes);

        // Get last node
        const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;

        // Build context
        const context: WorkflowContext = {
            nodes,
            edges: edges || [],
            lastNode,
            variables
        };

        // Get AI suggestions
        const analyzer = new AIWorkflowAnalyzer();
        const suggestions = await analyzer.getSuggestions(context);

        return NextResponse.json({
            suggestions,
            context: {
                nodeCount: nodes.length,
                variables: variables.slice(0, 5) // Limit to first 5
            }
        });

    } catch (error) {
        console.error('[Suggest API] Error:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}

function extractVariables(nodes: WorkflowNode[]): string[] {
    const variables = new Set<string>();

    nodes.forEach(node => {
        Object.entries(node.data).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const matches = value.matchAll(/\{\{([^}]+)\}\}/g);
                for (const match of matches) {
                    variables.add(match[1]);
                }
            }
        });
    });

    return Array.from(variables);
}
