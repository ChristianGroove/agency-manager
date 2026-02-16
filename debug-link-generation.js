const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be service role for admin
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLinkGeneration() {
    console.log('--- DEBUG LINK GENERATION ---');
    console.log('App URL Env:', process.env.NEXT_PUBLIC_APP_URL);

    const email = `test.audit.${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const fullName = 'Test User Audit';

    // Logic from actions.ts
    let redirectBase = 'https://app.pixy.com.co';
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`;
    }
    const redirectUrl = `${redirectBase}/auth/callback?next=/onboarding`;

    console.log('Calculated Redirect Base:', redirectBase);
    console.log('Calculated Redirect URL:', redirectUrl);

    if (!supabaseKey) {
        console.error('MISSING SERVICE ROLE KEY. Cannot test admin functions.');
        return;
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
            redirectTo: redirectUrl,
            data: {
                full_name: fullName,
                onboarding_completed: false
            }
        }
    });

    if (linkError) {
        console.error('Error generating link:', linkError);
    } else {
        console.log('\n--- SUPABASE RESPONSE ---');
        console.log('User ID:', linkData.user?.id);
        console.log('Action Link (Raw):', linkData.properties?.action_link);

        let actionLink = linkData.properties?.action_link;

        // Simulate Sanitization from actions.ts
        if (actionLink && (actionLink.includes('localhost') || actionLink.includes('127.0.0.1'))) {
            console.log('\n--- SANITIZATION WOULD TRIGGER ---');
            actionLink = actionLink.replace('http://localhost:3000', redirectBase);
            actionLink = actionLink.replace('http://127.0.0.1:3000', redirectBase);
            actionLink = actionLink.replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectBase)}`);
            console.log('Sanitized Link:', actionLink);
        } else {
            console.log('\n--- SANITIZATION WOULD *NOT* TRIGGER ---');
            console.log('Because link does not contain localhost/127.0.0.1');
        }
    }
}

debugLinkGeneration();
