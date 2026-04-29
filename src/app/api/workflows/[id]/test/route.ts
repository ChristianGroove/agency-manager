import { NextRequest, NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/features/automation/test-executor';
import { WorkflowDefinition } from '@/modules/features/automation/engine';
import { requireNonProductionRoute } from '@/modules/core/security/api-route-guards';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const guard = requireNonProductionRoute();
    if (guard) return guard;

    await props.params;
    try {
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

        const config: TestExecutionConfig = {
            workflowDefinition,
            testData: testData || {},
            dryRun: true,
            stepByStep: false
        };

        const executor = new TestExecutor(config);
        const result = await executor.execute();

        return NextResponse.json({
            ...result,
            logs: executor.getLogs()
        });

    } catch (error) {
        console.error('[Test API] Error:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
