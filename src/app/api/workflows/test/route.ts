
import { NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/features/automation/test-executor';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { validateWorkflowDefinition, validateWorkflowTestData } from '../_workflow-validation';

export async function POST(req: Request) {
    try {
        const orgId = await getCurrentOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: 'Unauthorized: No Organization Context' }, { status: 401 });
        }

        const body = await req.json();
        const { workflowDefinition, testData } = body;

        if (!workflowDefinition) {
            return NextResponse.json({ error: 'Missing workflow definition' }, { status: 400 });
        }

        const workflowValidation = validateWorkflowDefinition(workflowDefinition);
        if ('error' in workflowValidation) {
            return NextResponse.json({ error: workflowValidation.error }, { status: 400 });
        }

        const testDataValidation = validateWorkflowTestData(testData);
        if ('error' in testDataValidation) {
            return NextResponse.json({ error: testDataValidation.error }, { status: 400 });
        }

        const config: TestExecutionConfig = {
            workflowDefinition: workflowValidation.workflowDefinition,
            testData: testDataValidation.testData,
            dryRun: true, // Force dry run for safety in this endpoint
            stepByStep: false
        };

        const executor = new TestExecutor(config);
        const result = await executor.execute();
        const logs = executor.getLogs();

        return NextResponse.json({
            ...result,
            logs
        });

    } catch (error) {
        console.error('[API] Test execution failed:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: (error as Error).message },
            { status: 500 }
        );
    }
}
