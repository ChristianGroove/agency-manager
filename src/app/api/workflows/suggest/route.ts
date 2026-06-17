import { NextRequest, NextResponse } from 'next/server';
import { AIWorkflowAnalyzer, WorkflowContext } from '@/modules/features/automation/ai-analyzer';
import { WorkflowNode, WorkflowEdge } from '@/modules/features/automation/engine';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { validateWorkflowGraph } from '../_workflow-validation';
import { logWorkflowRouteError, workflowRouteErrorBody } from '../_error-utils';

const PUBLIC_WORKFLOW_SUGGESTIONS_ERROR = 'Workflow suggestions failed';

export async function POST(request: NextRequest) {
    try {
        // Governance: Ensure Org Context
        const orgId = await getCurrentOrganizationId();
        if (!orgId) {
            return NextResponse.json(
                { error: 'Unauthorized: No Organization Context' },
                { status: 401 }
            );
        }

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

        const graphValidation = validateWorkflowGraph(nodes, edges);
        if ('error' in graphValidation) {
            return NextResponse.json({ error: graphValidation.error }, { status: 400 });
        }

        // Extract variables from nodes
        const variables = extractVariables(graphValidation.nodes);

        // Get last node
        const lastNode = graphValidation.nodes.length > 0
            ? graphValidation.nodes[graphValidation.nodes.length - 1]
            : null;

        // Build context
        const context: WorkflowContext = {
            nodes: graphValidation.nodes,
            edges: graphValidation.edges,
            lastNode,
            variables
        };

        // Get AI suggestions via Engine
        const analyzer = new AIWorkflowAnalyzer(orgId);
        const suggestions = await analyzer.getSuggestions(context);

        return NextResponse.json({
            suggestions,
            context: {
                nodeCount: graphValidation.nodes.length,
                variables: variables.slice(0, 5) // Limit to first 5
            }
        });

    } catch (error: unknown) {
        logWorkflowRouteError('[Suggest API] Error:', error);
        return NextResponse.json(
            workflowRouteErrorBody(error, PUBLIC_WORKFLOW_SUGGESTIONS_ERROR),
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

