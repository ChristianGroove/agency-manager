
import { NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/core/automation/test-executor';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { workflowDefinition, testData } = body;

        if (!workflowDefinition) {
            return NextResponse.json({ error: 'Missing workflow definition' }, { status: 400 });
        }

        const config: TestExecutionConfig = {
            workflowDefinition,
            testData: testData || {},
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
