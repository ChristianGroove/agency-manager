import { NextRequest, NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/features/automation/test-executor';
import { WorkflowDefinition } from '@/modules/features/automation/engine';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { validateWorkflowDefinition, validateWorkflowTestData } from '../../_workflow-validation';
import { logWorkflowRouteError, workflowRouteErrorBody } from '../../_error-utils';

const PUBLIC_WORKFLOW_TEST_ERROR = 'Workflow test failed';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const orgId = await getCurrentOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: 'Unauthorized: No Organization Context' }, { status: 401 });
        }

        const body = await request.json();
        const { workflowDefinition, testData } = body as {
            workflowDefinition: WorkflowDefinition;
            testData: Record<string, unknown>;
        };

        if (!workflowDefinition) {
            return NextResponse.json(
                { error: 'Workflow definition is required' },
                { status: 400 }
            );
        }

        if (typeof params.id !== 'string' || !params.id.trim()) {
            return NextResponse.json({ error: 'Workflow id is required' }, { status: 400 });
        }

        const workflowValidation = validateWorkflowDefinition(workflowDefinition);
        if ('error' in workflowValidation) {
            return NextResponse.json({ error: workflowValidation.error }, { status: 400 });
        }

        const definitionId = (workflowValidation.workflowDefinition as { id?: unknown }).id;
        if (typeof definitionId === 'string' && definitionId.trim() && definitionId !== params.id) {
            return NextResponse.json({ error: 'Workflow id mismatch' }, { status: 400 });
        }

        const testDataValidation = validateWorkflowTestData(testData);
        if ('error' in testDataValidation) {
            return NextResponse.json({ error: testDataValidation.error }, { status: 400 });
        }

        const config: TestExecutionConfig = {
            workflowDefinition: workflowValidation.workflowDefinition,
            testData: testDataValidation.testData,
            dryRun: true,
            stepByStep: false
        };

        const executor = new TestExecutor(config);
        const result = await executor.execute();

        return NextResponse.json({
            ...result,
            logs: executor.getLogs()
        });

    } catch (error: unknown) {
        logWorkflowRouteError('[Test API] Error:', error);
        return NextResponse.json(
            workflowRouteErrorBody(error, PUBLIC_WORKFLOW_TEST_ERROR),
            { status: 500 }
        );
    }
}
