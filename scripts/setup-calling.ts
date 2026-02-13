#!/usr/bin/env node

/**
 * WhatsApp Calling API Setup Script
 * 
 * Activates Calling API and configures settings via Meta Graph API v24.0
 * 
 * Usage:
 *   npm run calling:init -- --enable
 *   npm run calling:init -- --disable
 *   npm run calling:init -- --icon=show
 *   npm run calling:init -- --icon=hide
 *   npm run calling:init -- --status
 */

const META_API_VERSION = 'v24.0';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WABA_ID = process.env.WABA_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';

interface CallingStatus {
    status: 'ENABLED' | 'DISABLED';
    call_icon_visibility: 'DEFAULT' | 'HIDE';
    callback_permission_status?: 'ENABLED' | 'DISABLED';
}

async function enableCalling() {
    console.log('\n🚀 Enabling WhatsApp Calling API...\n');

    // Step 1: Enable calling
    console.log('1️⃣  Enabling calling status...');
    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'ENABLED'
            })
        }
    );
    console.log('   ✅ Calling enabled\n');

    // Step 2: Set icon visibility to DEFAULT (visible)
    console.log('2️⃣  Setting call icon visibility...');
    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                call_icon_visibility: 'DEFAULT' // CRITICAL: Must be DEFAULT or HIDE
            })
        }
    );
    console.log('   ✅ Icon set to DEFAULT (visible)\n');

    // Step 3: Subscribe to 'calls' webhook field
    console.log('3️⃣  Subscribing to calls webhook...');
    const currentFields = await getSubscribedFields();
    const newFields = [...new Set([...currentFields, 'calls', 'account_settings_update'])];

    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${WABA_ID}/subscribed_apps`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscribed_fields: newFields
            })
        }
    );
    console.log('   ✅ Subscribed to: calls, account_settings_update\n');

    console.log('✅ Calling API fully activated!\n');
    console.log(`Webhook URL: ${APP_URL}/api/whatsapp/calling\n`);
}

async function disableCalling() {
    console.log('\n⏸️  Disabling WhatsApp Calling API...\n');

    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'DISABLED'
            })
        }
    );

    console.log('✅ Calling API disabled\n');
}

async function setIconVisibility(visible: boolean) {
    const visibility = visible ? 'DEFAULT' : 'HIDE';

    console.log(`\n🔘 Setting call icon visibility: ${visibility}...\n`);

    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                call_icon_visibility: visibility
            })
        }
    );

    console.log(`✅ Call icon ${visible ? 'visible' : 'hidden'}\n`);
}

async function getStatus(): Promise<CallingStatus> {
    const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings?fields=status,call_icon_visibility,callback_permission_status`,
        {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        }
    );

    const data = await response.json();
    return data;
}

async function displayStatus() {
    console.log('\n📊 Current Calling API Status\n');
    console.log('═'.repeat(50));

    try {
        const status = await getStatus();

        console.log(`\nStatus: ${status.status}`);
        console.log(`Icon Visibility: ${status.call_icon_visibility}`);
        console.log(`Callback Permission: ${status.callback_permission_status || 'N/A'}`);

        const capacity = await getCapacity();
        console.log(`\nCapacity:`);
        console.log(`  Active Calls: ${capacity.current}/${capacity.max}`);
        console.log(`  Available: ${capacity.available}`);
        console.log(`  Utilization: ${capacity.utilizationPercent.toFixed(1)}%`);

    } catch (error: any) {
        console.error('Error:', error.message);
    }

    console.log('\n' + '═'.repeat(50) + '\n');
}

async function getSubscribedFields(): Promise<string[]> {
    const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${WABA_ID}/subscribed_apps`,
        {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        }
    );

    const data = await response.json();
    return data.data?.[0]?.subscribed_fields || [];
}

async function getCapacity() {
    try {
        const response = await fetch(`${APP_URL}/api/whatsapp/calling`);
        const data = await response.json();
        return data.capacity;
    } catch {
        return { current: 0, max: 1000, available: 1000, utilizationPercent: 0 };
    }
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   WhatsApp Calling API Setup (Meta 2026)   ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Validate environment
    if (!PHONE_NUMBER_ID || !WABA_ID || !ACCESS_TOKEN) {
        console.error('❌ Error: Missing environment variables');
        console.error('   Required: PHONE_NUMBER_ID, WABA_ID, META_ACCESS_TOKEN\n');
        process.exit(1);
    }

    // Parse arguments
    const args = process.argv.slice(2);

    if (args.includes('--enable')) {
        await enableCalling();
    } else if (args.includes('--disable')) {
        await disableCalling();
    } else if (args.includes('--icon=show')) {
        await setIconVisibility(true);
    } else if (args.includes('--icon=hide')) {
        await setIconVisibility(false);
    } else if (args.includes('--status')) {
        await displayStatus();
    } else {
        console.log(`Usage:
  npm run calling:init -- --enable        Enable Calling API
  npm run calling:init -- --disable       Disable Calling API
  npm run calling:init -- --icon=show     Show call icon (DEFAULT)
  npm run calling:init -- --icon=hide     Hide call icon (HIDE)
  npm run calling:init -- --status        Display current status

Examples:
  npm run calling:init -- --enable
  npm run calling:init -- --icon=show
  npm run calling:init -- --status
`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
