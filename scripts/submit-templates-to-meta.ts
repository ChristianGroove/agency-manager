/**
 * Production Script: Clean fake templates + Create & Submit 5 English templates to Meta
 * 
 * This script:
 * 1. Deletes ALL local templates (they have fake APPROVED status, no meta_id)
 * 2. Creates 5 production-quality English templates
 * 3. Submits each to Meta Graph API for real approval
 * 4. Stores the meta_id back in the DB
 * 
 * Run: npx tsx scripts/submit-templates-to-meta.ts
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const META_API_VERSION = 'v24.0'
const META_GRAPH_URL = 'https://graph.facebook.com'

// The active Pixy Spaces WABA
const TARGET_WABA_ID = '1541979373724497'

// 5 production English templates for Meta app review
const TEMPLATES = [
    {
        name: 'welcome_message',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hello {{1}}, welcome to {{2}}! We are excited to have you on board. Our team is ready to assist you with anything you need. Feel free to reach out anytime.',
                example: {
                    body_text: [['John', 'Pixy Agency']]
                }
            },
            {
                type: 'FOOTER',
                text: 'Powered by Pixy'
            }
        ]
    },
    {
        name: 'appointment_reminder',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, this is a friendly reminder about your appointment scheduled for {{2}} at {{3}}. Please reply CONFIRM to confirm or RESCHEDULE if you need to change the time.',
                example: {
                    body_text: [['Sarah', 'March 15, 2026', '2:00 PM']]
                }
            },
            {
                type: 'FOOTER',
                text: 'Reply STOP to opt out of reminders'
            }
        ]
    },
    {
        name: 'order_update',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, your order #{{2}} has been {{3}}. You can track your order status anytime through our portal. Thank you for your purchase!',
                example: {
                    body_text: [['Michael', '10452', 'shipped']]
                }
            },
            {
                type: 'FOOTER',
                text: 'Powered by Pixy'
            }
        ]
    },
    {
        name: 'seasonal_promotion',
        category: 'MARKETING',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, great news! We have an exclusive offer for you: {{2}}. This promotion is available for a limited time. Visit our website to learn more and take advantage of this deal.',
                example: {
                    body_text: [['Emily', '20% off all services this month']]
                }
            },
            {
                type: 'FOOTER',
                text: 'Reply STOP to unsubscribe from promotional messages'
            }
        ]
    },
    {
        name: 'feedback_request',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, thank you for choosing {{2}}! Your satisfaction is important to us. We would love to hear your feedback on your recent experience. How would you rate our service from 1 to 5?',
                example: {
                    body_text: [['David', 'Pixy Agency']]
                }
            },
            {
                type: 'FOOTER',
                text: 'Powered by Pixy'
            }
        ]
    }
]

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // ── Step 1: Resolve Pixy Spaces credentials ─────────────────────────
    console.log('\n=== Step 1: Resolving Pixy Spaces credentials ===')

    // First find the correct org that owns the Pixy Spaces WABA
    const { data: allConns } = await supabase
        .from('integration_connections')
        .select('id, provider_key, status, connection_name, metadata, credentials, organization_id')
        .eq('status', 'active')
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])

    // Find the Pixy Spaces connection specifically
    const connection = allConns?.find(c => {
        const meta = (c.metadata as any) || {}
        return meta.waba_id === TARGET_WABA_ID
    })

    if (!connection) {
        console.error('❌ No active WhatsApp connection found for WABA', TARGET_WABA_ID)
        console.log('Available connections:')
        for (const c of allConns || []) {
            const meta = (c.metadata as any) || {}
            console.log(`  - ${c.connection_name} waba=${meta.waba_id} org=${c.organization_id} status=${c.status}`)
        }
        return
    }

    const metadata = connection.metadata as any || {}
    const creds = connection.credentials as any || {}
    const wabaId = metadata.waba_id || TARGET_WABA_ID
    const accessToken = creds.access_token || creds.accessToken
    const orgId = connection.organization_id

    console.log(`  Connection: ${connection.connection_name}`)
    console.log(`  WABA ID: ${wabaId}`)
    console.log(`  Org ID: ${orgId}`)
    console.log(`  Token length: ${accessToken?.length || 0}`)

    if (!accessToken) {
        console.error('❌ No access token found')
        return
    }

    // ── Step 2: Clean up ALL fake local templates ────────────────────────
    console.log('\n=== Step 2: Cleaning up fake local templates ===')
    const { data: existing } = await supabase
        .from('messaging_templates')
        .select('id, name, status, meta_id')

    console.log(`  Found ${existing?.length || 0} local templates to delete`)

    if (existing && existing.length > 0) {
        const { error: delError } = await supabase
            .from('messaging_templates')
            .delete()
            .in('id', existing.map(t => t.id))

        if (delError) {
            console.error('  ❌ Delete error:', delError.message)
            return
        }
        console.log(`  ✅ Deleted ${existing.length} fake templates`)
    }

    // ── Step 3: Create & Submit 5 templates to Meta ─────────────────────
    console.log('\n=== Step 3: Submitting 5 templates to Meta ===')

    const results: { name: string, success: boolean, metaId?: string, status?: string, error?: string }[] = []

    for (const tmpl of TEMPLATES) {
        console.log(`\n  📄 Submitting: ${tmpl.name} (${tmpl.category}, ${tmpl.language})`)

        const payload = {
            name: tmpl.name,
            category: tmpl.category,
            language: tmpl.language,
            components: tmpl.components
        }

        const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates`

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json()

            if (!response.ok) {
                const errorMsg = result?.error?.message || 'Unknown error'
                console.error(`  ❌ Meta rejected: ${errorMsg}`)
                console.error(`     Full error:`, JSON.stringify(result, null, 2))
                results.push({ name: tmpl.name, success: false, error: errorMsg })
                continue
            }

            console.log(`  ✅ Meta accepted: id=${result.id} status=${result.status}`)

            // Save to local DB with real meta_id
            const bodyText = tmpl.components.find(c => c.type === 'BODY')?.text || ''
            const { error: insertError } = await supabase
                .from('messaging_templates')
                .insert({
                    organization_id: orgId,
                    name: tmpl.name,
                    category: tmpl.category,
                    language: tmpl.language,
                    components: tmpl.components,
                    status: result.status || 'PENDING',
                    meta_id: result.id,
                    content: bodyText
                })

            if (insertError) {
                console.error(`  ⚠️ DB insert error: ${insertError.message}`)
            } else {
                console.log(`  ✅ Saved to DB with meta_id=${result.id}`)
            }

            results.push({ name: tmpl.name, success: true, metaId: result.id, status: result.status })
        } catch (e: any) {
            console.error(`  ❌ Network error: ${e.message}`)
            results.push({ name: tmpl.name, success: false, error: e.message })
        }
    }

    // ── Step 4: Summary ─────────────────────────────────────────────────
    console.log('\n\n════════════════════════════════════════════')
    console.log('  SUBMISSION SUMMARY')
    console.log('════════════════════════════════════════════')

    const succeeded = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    for (const r of results) {
        const icon = r.success ? '✅' : '❌'
        const detail = r.success ? `meta_id=${r.metaId} [${r.status}]` : r.error
        console.log(`  ${icon} ${r.name}: ${detail}`)
    }

    console.log(`\n  Total: ${succeeded.length}/5 submitted successfully`)

    if (succeeded.length > 0) {
        console.log('\n  ⏳ Templates are now pending Meta review.')
        console.log('  📋 Meta typically approves UTILITY templates within minutes.')
        console.log('  📋 MARKETING templates may take up to 24 hours.')
        console.log('\n  Next: Run "Sincronizar" in Settings → Plantillas to check approval status.')
    }
}

main().catch(console.error)
