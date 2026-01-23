#!/usr/bin/env node

/**
 * Publish WhatsApp Flows to Meta Graph API v24.0
 * 
 * Usage: npm run flows:publish -- --flow=appointment_booking
 */

import fs from 'fs/promises';
import path from 'path';

const META_API_VERSION = 'v24.0';
const WABA_ID = process.env.WABA_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';

interface FlowConfig {
    name: string;
    categories: string[];
    endpoint_uri: string;
}

const FLOW_CONFIGS: Record<string, FlowConfig> = {
    appointment_booking: {
        name: 'Agendamiento de Citas',
        categories: ['APPOINTMENT_BOOKING'],
        endpoint_uri: `${APP_URL}/api/whatsapp/flows`
    },
    lead_generation: {
        name: 'Generación de Leads',
        categories: ['LEAD_GENERATION'],
        endpoint_uri: `${APP_URL}/api/whatsapp/flows`
    },
    tech_support: {
        name: 'Soporte Técnico',
        categories: ['CUSTOMER_SUPPORT'],
        endpoint_uri: `${APP_URL}/api/whatsapp/flows`
    }
};

async function publishFlow(flowName: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Publishing Flow: ${flowName}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!WABA_ID || !ACCESS_TOKEN) {
        console.error('❌ Error: WABA_ID and META_ACCESS_TOKEN must be set');
        process.exit(1);
    }

    const config = FLOW_CONFIGS[flowName];
    if (!config) {
        console.error(`❌ Error: Unknown flow "${flowName}"`);
        console.log(`Available flows: ${Object.keys(FLOW_CONFIGS).join(', ')}`);
        process.exit(1);
    }

    try {
        // Step 1: Load Flow JSON
        console.log('📄 Loading Flow JSON...');
        const flowPath = path.join(
            process.cwd(),
            'src/lib/meta/flows/schemas',
            `${flowName}.json`
        );
        const flowJson = await fs.readFile(flowPath, 'utf8');
        const flowData = JSON.parse(flowJson);

        console.log(`   ✓ Loaded ${flowName}.json (v${flowData.version})`);

        // Step 2: Create Flow
        console.log('\n🚀 Creating Flow on Meta...');
        const createResponse = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${WABA_ID}/flows`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: config.name,
                    categories: config.categories,
                    endpoint_uri: config.endpoint_uri
                })
            }
        );

        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(`Failed to create flow: ${JSON.stringify(error)}`);
        }

        const { id: flowId } = await createResponse.json();
        console.log(`   ✓ Flow created with ID: ${flowId}`);

        // Step 3: Upload Flow JSON as asset
        console.log('\n📤 Uploading Flow JSON...');
        const uploadResponse = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${flowId}/assets`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'flow.json',
                    asset_type: 'FLOW_JSON',
                    file: flowJson
                })
            }
        );

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(`Failed to upload JSON: ${JSON.stringify(error)}`);
        }

        console.log('   ✓ Flow JSON uploaded');

        // Step 4: Publish Flow (DRAFT → PUBLISHED)
        console.log('\n🎯 Publishing Flow...');
        const publishResponse = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${flowId}/publish`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`
                }
            }
        );

        if (!publishResponse.ok) {
            const error = await publishResponse.json();
            throw new Error(`Failed to publish: ${JSON.stringify(error)}`);
        }

        const publishData = await publishResponse.json();
        console.log('   ✓ Flow published successfully');

        // Step 5: Save Flow ID to .env.local
        console.log('\n💾 Saving Flow ID...');
        const envKey = `${flowName.toUpperCase()}_FLOW_ID`;
        const envLine = `${envKey}=${flowId}\n`;

        try {
            const envPath = path.join(process.cwd(), '.env.local');
            let envContent = '';

            try {
                envContent = await fs.readFile(envPath, 'utf8');
            } catch (err) {
                // File doesn't exist, create it
            }

            // Check if env var already exists
            const regex = new RegExp(`^${envKey}=.*$`, 'm');
            if (regex.test(envContent)) {
                // Update existing
                envContent = envContent.replace(regex, envLine.trim());
            } else {
                // Add new
                envContent += `\n# Flow IDs\n${envLine}`;
            }

            await fs.writeFile(envPath, envContent);
            console.log(`   ✓ Saved ${envKey} to .env.local`);
        } catch (err) {
            console.warn(`   ⚠ Could not save to .env.local: ${err}`);
        }

        // Success summary
        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ Flow Published Successfully!');
        console.log(`${'='.repeat(60)}`);
        console.log(`Flow ID: ${flowId}`);
        console.log(`Name: ${config.name}`);
        console.log(`Status: PUBLISHED`);
        console.log(`Endpoint: ${config.endpoint_uri}`);
        console.log(`\nTo use in code:`);
        console.log(`process.env.${envKey}`);
        console.log(`${'='.repeat(60)}\n`);

        return flowId;

    } catch (error: any) {
        console.error('\n❌ Error publishing flow:', error.message);
        process.exit(1);
    }
}

async function publishAllFlows() {
    console.log('Publishing all Flows...\n');

    const flowNames = Object.keys(FLOW_CONFIGS);

    for (const flowName of flowNames) {
        await publishFlow(flowName);

        // Small delay between flows
        if (flowNames.indexOf(flowName) < flowNames.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n✅ All Flows published successfully!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const flowArg = args.find(arg => arg.startsWith('--flow='));
const allArg = args.includes('--all');

if (allArg) {
    publishAllFlows();
} else if (flowArg) {
    const flowName = flowArg.split('=')[1];
    publishFlow(flowName);
} else {
    console.log(`
Usage:
  npm run flows:publish -- --flow=<flow_name>
  npm run flows:publish -- --all

Available flows:
  - appointment_booking
  - lead_generation
  - tech_support

Example:
  npm run flows:publish -- --flow=appointment_booking
    `);
    process.exit(1);
}
