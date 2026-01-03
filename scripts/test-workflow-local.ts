
import { createClient } from '@supabase/supabase-js';
import { WebhookManager } from '../src/modules/core/messaging/webhook-handler';
import { WorkflowDefinition } from '../src/modules/core/automation/engine';
import dotenv from 'dotenv';
import path from 'path';

// Load Env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testWorkflow() {
    console.log("🚀 Starting Workflow Engine Verification");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Env Vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    }

    // Direct Client (Simulating Server Environment)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Setup Data: Create a Test Workflow Definition
    const definition: WorkflowDefinition = {
        nodes: [
            {
                id: 'start',
                type: 'trigger',
                data: { label: 'Start' },
                position: { x: 0, y: 0 }
            },
            {
                id: 'check-keyword',
                type: 'condition',
                data: {
                    variable: 'message.content',
                    operator: 'contains',
                    value: 'hola'
                },
                position: { x: 200, y: 0 }
            },
            {
                id: 'send-greeting',
                type: 'action',
                data: {
                    actionType: 'send_message',
                    message: '¡Hola {{message.sender}}! Soy el bot.'
                },
                position: { x: 400, y: -100 }
            }
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'check-keyword' },
            { id: 'e2', source: 'check-keyword', target: 'send-greeting' }
        ]
    };

    // Fetch Organization ID (assuming first one found)
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id').limit(1);

    if (orgError) {
        console.error("❌ Failed to fetch organizations:", orgError);
        return;
    }

    const orgId = orgs?.[0]?.id;

    if (!orgId) {
        console.error("❌ No organization found. Cannot run test.");
        return;
    }

    console.log(`organization found: ${orgId}`);

    // Insert Workflow
    const workflowId = crypto.randomUUID();
    const { error: insertError } = await supabase
        .from('workflows')
        .insert({
            id: workflowId,
            organization_id: orgId,
            name: 'Test Setup Bot',
            trigger_type: 'webhook',
            trigger_config: { channel: 'whatsapp' },
            definition,
            is_active: true
        });

    if (insertError) {
        console.error("❌ Failed to insert workflow:", insertError);
        return;
    }
    console.log(`✅ Test Workflow inserted: ${workflowId}`);

    // 2. Simulate Webhook Event
    // We instantiate the WebhookManager manually for testing
    // IMPORTANT: WebhookManager usually uses server actions/cookies. 
    // We need to bypass that dependency or ensure it uses our direct client.
    // The WebhookManager in its current state creates its own client via 'createClient' from lib.
    // We cannot easily inject the client into it without refactoring.

    // STRATEGY: Instead of using WebhookManager class directly (which dependencies are hard to mock here),
    // let's just instantiate the Engine directly. This tests the CORE logic (Traversal etc).

    console.log("⚙️  Running Engine Directly for Test...");

    const { WorkflowEngine } = await import('../src/modules/core/automation/engine');

    const context = {
        message: {
            sender: '+123456789',
            content: 'hola mundo'
        }
    };

    const engine = new WorkflowEngine(definition, context);
    await engine.start();

    // 3. Cleanup
    await supabase.from('workflows').delete().eq('id', workflowId);
    console.log("🧹 Test Workflow cleaned up.");

    console.log("✅ Verification Script Completed.");
}

testWorkflow().catch(console.error);
