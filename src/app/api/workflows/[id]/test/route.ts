import { NextRequest, NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/core/automation/test-executor';
import { WorkflowDefinition } from '@/modules/core/automation/engine';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
