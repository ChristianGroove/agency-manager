
// scripts/debug_trigger.ts
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDebug() {
    console.log("=== DEBUGGING AUTOMATION TRIGGER ===");

    // 1. Get Latest Conversation
    const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (convError || !convs || convs.length === 0) {
        console.error("No conversations found or error:", convError);
        return;
    }

    const conv = convs[0];
    console.log(`\n1. Target Conversation: ${conv.id}`);
    console.log(`   - Phone: ${conv.phone}`);
    console.log(`   - Org: ${conv.organization_id}`);
    console.log(`   - Channel: ${conv.channel}`);
    console.log(`   - Connection: ${conv.connection_id}`);

    // 2. Get Active Workflows for this Org
    const { data: workflows, error: wfError } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', conv.organization_id)
        .eq('is_active', true);

    console.log(`\n2. Active Workflows for Org (${workflows?.length || 0}):`);
    if (workflows) {
        workflows.forEach(wf => {
            console.log(`   [${wf.id}] ${wf.name}`);
            console.log(`     - Type: ${wf.trigger_type}`);
            console.log(`     - Config:`, JSON.stringify(wf.trigger_config));
        });
    }

    // 3. Simulate Logic
    console.log(`\n3. Simulating Trigger Evaluation...`);
    const messageContent = "test trigger";
    const leadId = conv.lead_id;
    const conversationId = conv.id;
    const channel = conv.channel;
    const connectionId = conv.connection_id;

    // REPLICATE LOGIC FROM automation-trigger.service.ts
    for (const wf of workflows) {
        console.log(`\n   Checking Workflow: ${wf.name}...`);
        const config = wf.trigger_config || {};
        let match = false;
        let skipReason = '';

        if (!config) {
            console.log("     ⚠️ Config is null/undefined!");
            continue;
        }

        // ... (Simplified logic replication)
        if (wf.trigger_type === 'message_received' || wf.trigger_type === 'webhook') {
            if (wf.trigger_type === 'webhook' && config.keyword && config.keyword.trim() !== '') {
                const keyword = config.keyword.toLowerCase();
                if (messageContent.includes(keyword)) match = true;
                else skipReason = `Keyword mismatch (${keyword})`;
            } else {
                match = true;
                console.log("     ✅ 'Any Message' Match!");
            }
        }
        else {
            skipReason = `Type ${wf.trigger_type} not tested here`;
        }

        if (match) {
            // Channel Check
            if (config.channels && Array.isArray(config.channels) && config.channels.length > 0) {
                console.log(`     ℹ️ Checking Channels: ${JSON.stringify(config.channels)} vs Connection: ${connectionId}`);

                if (connectionId) {
                    const params = config.channels;
                    // Logic Check
                    let isAllowed = false;
                    if (params.includes('all')) isAllowed = true;
                    else {
                        isAllowed = params.some(ch => {
                            if (ch === connectionId) return true;
                            if (ch.includes(':') && ch.startsWith(connectionId + ':')) return true;
                            return false;
                        });
                    }

                    if (!isAllowed) {
                        match = false;
                        skipReason = `Channel mismatch. Conn=${connectionId} not in list.`;
                    } else {
                        console.log("     ✅ Channel Match!");
                    }
                } else {
                    console.log("     ⚠️ No Connection ID available to validate channel restrictions. Assuming allowed? Or blocked? IN SERVICE IT IS ALLOWED IF NO CONN ID.");
                    // In my service rewrite: if (finalConnectionId) { check } else { skip check? }
                    // "if (finalConnectionId) { ... }" -> If null, block is skipped. So allowed.
                }
            }
        }

        if (match) {
            console.log("     🚀 WOULD TRIGGER");
        } else {
            console.log(`     ❌ SKIPPED: ${skipReason}`);
        }
    }
}

runDebug();
