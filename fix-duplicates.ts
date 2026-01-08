
import { supabaseAdmin } from './src/lib/supabase-admin';

async function main() {
    console.log('Searching for duplicate connections...');

    // Fetch all Meta WhatsApp connections
    const { data: connections, error } = await supabaseAdmin
        .from('integration_connections')
        .select('*')
        .eq('provider_key', 'meta_whatsapp')
        .neq('status', 'deleted'); // Only check active/inactive ones

    if (error) {
        console.error('Error fetching connections:', error);
        return;
    }

    console.log(`Found ${connections.length} total Meta WhatsApp connections.`);

    // Group by phoneNumberId
    const groups: Record<string, any[]> = {};

    const { decryptCredentials } = await import('@/modules/core/integrations/encryption');

    for (const conn of connections) {
        let creds = conn.credentials || {};
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds); } catch (e) { }
        }
        creds = decryptCredentials(creds);
        const phoneId = creds.phoneNumberId || creds.phone_number_id;

        if (phoneId) {
            if (!groups[phoneId]) groups[phoneId] = [];
            groups[phoneId].push(conn);
        }
    }

    // Process duplicates
    for (const [phoneId, conns] of Object.entries(groups)) {
        if (conns.length > 1) {
            console.log(`\nDuplicate found for Phone ID: ${phoneId}`);

            // Sort by created_at descending (keep newest)
            conns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const toKeep = conns[0];
            const toDelete = conns.slice(1);

            console.log(`Keeping newest: ${toKeep.id} (${toKeep.connection_name}) - ${toKeep.created_at}`);

            for (const duplicate of toDelete) {
                console.log(`Deleting duplicate: ${duplicate.id} (${duplicate.connection_name}) - ${duplicate.created_at}`);

                const { error: delError } = await supabaseAdmin
                    .from('integration_connections')
                    .update({ status: 'deleted' })
                    .eq('id', duplicate.id);

                if (delError) {
                    console.error(`Failed to delete ${duplicate.id}:`, delError);
                } else {
                    console.log(`Successfully soft-deleted ${duplicate.id}`);
                }
            }
        }
    }

    console.log('\nDone.');
}

main().catch(console.error);
