
import { NextResponse } from 'next/server';
import { TestExecutor, TestExecutionConfig } from '@/modules/features/automation/test-executor';
import { requireAuthenticatedUser } from '@/modules/core/security/api-route-guards';

export async function POST(req: Request) {
    const guard = await requireAuthenticatedUser();
    if (guard) return guard;

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
