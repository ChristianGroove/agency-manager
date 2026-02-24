const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateTriggerExecution() {
    const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_active', true);

    const testConnectionId = '1b2ff60e-6530-4f50-b403-cc57641f40e1'; // One of the IDs in the array

    workflows?.forEach(wf => {
        const config = wf.trigger_config;
        console.log(`\nEvaluating Workflow: ${wf.name} (${wf.id})`);

        // CHANNEL CHECK LOGIC
        let match = true;
        let skipReason = '';

        if (match && config.channels && Array.isArray(config.channels) && config.channels.length > 0) {
            console.log(`Checking ${config.channels.length} channels...`);
            if (testConnectionId) {
                const allowedChannels = config.channels;
                if (!allowedChannels.includes('all')) {
                    const isAllowed = allowedChannels.some((ch) => {
                        console.log(`  Comparing config: ${ch} WITH message: ${testConnectionId}`);
                        if (ch === testConnectionId) return true;
                        if (ch.includes(':') && ch.startsWith(testConnectionId + ':')) return true;
                        // What if finalConnectionId has an asset but ch doesn't?
                        if (testConnectionId.includes(':') && testConnectionId.startsWith(ch + ':')) return true;
                        return false;
                    });

                    if (!isAllowed) {
                        match = false;
                        skipReason = `Channel mismatch (${testConnectionId})`;
                    }
                }
            }
        }

        console.log(`Result: match=${match}, reason=${skipReason}`);
    });
}

simulateTriggerExecution().catch(console.error);
