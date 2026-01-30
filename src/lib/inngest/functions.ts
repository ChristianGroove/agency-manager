import { inngest } from "./client";
import { trackUsage } from "@/modules/core/billing/usage-tracker";
import { WorkflowEngine } from "@/modules/core/automation/engine";
import { createClient } from "@supabase/supabase-js";

// Helper to load execution context
const loadExecution = async (executionId: string) => {
    // Use Service Role for worker
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // We need the full execution record + workflow definition
    // In a real app we might fetch these separately for optimization
    const { data: execution, error } = await supabase
        .from('workflow_executions')
        .select(`
            *,
            workflows (definition)
        `)
        .eq('id', executionId)
        .single();

    if (error || !execution) throw new Error("Execution not found");
    return execution;
};

const updateExecutionStatus = async (executionId: string, status: string, context?: any) => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('workflow_executions')
        .update({ status, context, updated_at: new Date().toISOString() })
        .eq('id', executionId);
};


export const runWorkflow = inngest.createFunction(
    { name: "Run Workflow Execution", id: "run-workflow", concurrency: 10 }, // Limit concurrency per function
    { event: "automation.execute" },
    async ({ event, step }) => {
        const { executionId, organizationId } = event.data;

        // 1. Check Usage Limits (Protection)
        await step.run("check-limits", async () => {
            const { assertUsageAllowed } = await import("@/modules/core/billing/usage-limiter");
            await assertUsageAllowed({ organizationId, engine: 'automation' });
        });

        // 2. Load Execution State
        const execution = await step.run("load-execution", async () => {
            return await loadExecution(executionId);
        });

        // 2. Initialize Engine
        const definition = execution.workflows.definition;
        const initialContext = execution.context || {};

        // Ensure organization_id is in context for metering
        initialContext.organization_id = organizationId;

        // We initialize engine to use its Logic & Navigation methods
        // BUT we don't start the engine's internal loop. We control the loop here.
        const engine = new WorkflowEngine(definition, initialContext);

        // 3. Track Start Usage
        await step.run("metering-start", async () => {
            await trackUsage({
                organizationId,
                engine: "automation",
                action: "automation.execute",
                metadata: { executionId, workflowId: event.data.workflowId }
            });
        });

        // 4. FIND START NODE (Trigger)
        // If we are resuming, we might have a different logic, but for "automation.execute" it implies Start or Restart.
        // If we want to support Resume, we might check an explicit stepId in payload.
        // For Phase 2 MVP: Start from Trigger.

        const triggerNode = definition.nodes.find((n: any) => n.type === 'trigger');
        if (!triggerNode) return; // Should fail

        // Queue of nodes to process (BFS/DFS)
        // In a linear workflow, it's just one next node.
        // For simplicity in this worker, we assume a path.
        // Handling strict branching in a stored-state worker is complex.

        // Strategy: We keep a "cursor" in the execution context?
        // Or simpler: We just run recursively?
        // PROBLEM: Recursion in Inngest needs to be finite or careful.
        // Better: We loop while there is a "nextStep".

        let currentNode = triggerNode;
        // Logic to run loop
        // We accept a max steps limit to prevent infinite loops billing attacks
        let stepsRun = 0;
        const MAX_STEPS = 50;

        while (currentNode && stepsRun < MAX_STEPS) {
            stepsRun++;

            // A. EXECUTE LOGIC
            // We wrap execution in step.run to handle retries/persistence
            await step.run(`execute-${currentNode.id}-${stepsRun}`, async () => {
                console.log(`[Worker] Executing ${currentNode.id} (${currentNode.type})`);
                await engine.executeNodeLogic(currentNode);
            });

            // B. HANDLE SUSPENSION (Delay)
            if (currentNode.type === 'delay') {
                const duration = currentNode.data.duration || '1m'; // parse logic needed
                // Assuming engine.executeNodeLogic throws "WORKFLOW_SUSPENDED"?? 
                // No, we modified it to be public but it still has the old logic.
                // We should inspect the node type explicitly here instead of relying on Engine's internal throw.

                // Engine.executeNodeLogic currently throws for delay. We should catch it?
                // Or better, we handle delay native here.
                // Let's assume we handle it here:
                // Inngest sleep
                // For MVP: Simple sleep 5s to demo. 
                // Real: Parse duration.
                if (duration === '1m') await step.sleep(`delay-${currentNode.id}`, "1m");
            }

            // C. NAVIGATION
            const nextNodes: any[] = engine.getNextNodes(currentNode);

            if (nextNodes.length === 0) break; // End

            // Simplification: Take first path (Linear support)
            // Branching support requires storing the "Frontier" of nodes.
            currentNode = nextNodes[0];
        }

        // 5. Finish
        await step.run("mark-completed", async () => {
            await updateExecutionStatus(executionId, 'completed', engine['context']);
        });

        return { success: true, stepsRun };
    }
);

export const contractOrchestrator = inngest.createFunction(
    { name: "Contract Life-cycle Orchestrator", id: "contract-orchestrator" },
    { event: "contract.generated" },
    async ({ event, step }) => {
        const { contractId, organizationId, clientId, usage } = event.data;

        // 1. Meter AI Usage
        if (usage) {
            await step.run("meter-ai-usage", async () => {
                const { trackUsage } = await import("@/modules/core/billing/usage-tracker");

                // Track AI Messages (1 per generation)
                await trackUsage({
                    organizationId,
                    engine: 'ai',
                    action: 'contract.generation',
                    quantity: 1,
                    metadata: { contractId }
                });

                // Track AI Tokens
                await trackUsage({
                    organizationId,
                    engine: 'ai',
                    action: 'contract.tokens',
                    quantity: usage.input_tokens + usage.output_tokens,
                    metadata: { contractId, ...usage }
                });
            });
        }

        // 2. Background Processing (Simulation of Render -> Vault)
        // In a real environment, we would use a headless browser or a service to render HTML to PDF
        // For now, we update the status and log the step.
        await step.run("update-crm-status-sent", async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            await supabase.from('contracts')
                .update({ status: 'sent', updated_at: new Date().toISOString() })
                .eq('id', contractId);
        });

        // 3. Send Branded Email
        await step.run("send-delivery-email", async () => {
            const { emailService } = await import("@/modules/core/communication/email-service");
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch Client & Org details for branding
            const { data: contract } = await supabase
                .from('contracts')
                .select('*, client:clients(name, email), organization:organizations(name)')
                .eq('id', contractId)
                .single();

            if (contract?.client?.email) {
                await emailService.sendEmail(
                    contract.client.email,
                    'contract_delivery',
                    {
                        client_name: contract.client.name,
                        agency_name: contract.organization.name,
                        contract_number: contract.number || 'N/A'
                    },
                    { organizationId }
                );
            }
        });

        return { success: true };
    }
);

import { vaultSnapshotScheduler } from "@/modules/core/data-vault/scheduler"

export const functions = [runWorkflow, vaultSnapshotScheduler, contractOrchestrator];
