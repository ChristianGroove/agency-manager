
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMatch() {
    const metadata = {
        pageId: "109115205324966", // From log
        // instagramBusinessId: "17841472900879269" 
    };
    const channel = 'messenger';

    console.log('Testing match for:', { metadata, channel });

    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('id, organization_id, provider_key, metadata, status')
        .eq('provider_key', 'meta_business')
        .eq('status', 'active');

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.log(`Found ${connections.length} meta_business connections.`);

    const found = connections.find((c) => {
        const assets = c.metadata?.selected_assets || [];
        console.log(`Connection ${c.id} assets:`, JSON.stringify(assets, null, 2));

        if (channel === 'messenger') {
            return assets.some((a) => {
                // Exact logic from InboxService
                const matchesId = (a.id === metadata?.pageId || a.id === metadata?.page_id);
                const matchesType = (a.type === 'page' || a.type === 'facebook_page'); // Review exact string from DB
                const isMatch = matchesId && matchesType;
                console.log(`Checking asset ${a.id} (${a.type}): ID Match? ${matchesId}, Type Match? ${matchesType} => ${isMatch}`);
                return isMatch;
            });
        }
        return false;
    });

    if (found) {
        console.log('SUCCESS! Matched connection:', found.id);
    } else {
        console.log('FAILURE! No matching connection found.');
    }
}

testMatch();
