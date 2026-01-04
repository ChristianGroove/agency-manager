// "use server" removed from top

import OpenAI from "openai"
import { supabaseAdmin } from "@/lib/supabase-admin"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "stub_key_for_build_only",
})

interface IntentResult {
    intent: string
    confidence: number
    extractedEntities: Record<string, any>
    suggestedTeam?: string
    suggestedSkills?: string[]
}

const INTENT_DEFINITIONS = {
    billing_inquiry: {
        description: 'Questions about payments, invoices, subscriptions, pricing',
        team: 'billing',
        skills: ['billing', 'payments'],
        keywords: ['payment', 'invoice', 'subscription', 'price', 'cost', 'billing']
    },
    technical_support: {
        description: 'Technical issues, bugs, how-to questions',
        team: 'support',
        skills: ['technical', 'troubleshooting'],
        keywords: ['error', 'bug', 'not working', 'broken', 'issue', 'problem']
    },
    sales_question: {
        description: 'Pre-sales questions, feature inquiries, demos',
        team: 'sales',
        skills: ['sales', 'product_knowledge'],
        keywords: ['buy', 'purchase', 'demo', 'trial', 'features', 'plan']
    },
    complaint: {
        description: 'Customer complaints, dissatisfaction, issues',
        team: 'customer_success',
        skills: ['conflict_resolution', 'empathy'],
        keywords: ['disappointed', 'terrible', 'worst', 'complaint', 'unacceptable']
    },
    feature_request: {
        description: 'Suggestions for new features or improvements',
        team: 'product',
        skills: ['product_management'],
        keywords: ['feature', 'suggestion', 'improvement', 'would be nice', 'could you add']
    },
    order_status: {
        description: 'Questions about order status, shipping, delivery',
        team: 'operations',
        skills: ['order_management'],
        keywords: ['order', 'shipping', 'delivery', 'tracking', 'when will']
    },
    general_inquiry: {
        description: 'General questions, greetings, other',
        team: 'support',
        skills: [],
        keywords: []
    }
}

/**
 * Detect customer intent using AI
 */
export async function detectIntent(messageContent: string): Promise<{
    success: boolean
    result?: IntentResult
    error?: string
}> {
    "use server"
    const startTime = Date.now()

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are an intent classification expert for customer service.

Classify messages into these intents:
${Object.entries(INTENT_DEFINITIONS).map(([intent, def]) =>
                        `- ${intent}: ${def.description}`
                    ).join('\n')}

Extract relevant entities:
- product: Product or service name
- amount: Any monetary value
- order_id: Order/ticket/reference number
- date: Any mentioned date
- email: Email address
- phone: Phone number

Return JSON:
{
  "intent": "one of the intents above",
  "confidence": 0.0 to 1.0,
  "extractedEntities": {entity: value}
}`
                },
                {
                    role: 'user',
                    content: `Classify this message:\n\n"${messageContent}"`
                }
            ],
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: 'json_object' }
        })

        const responseText = completion.choices[0]?.message?.content
        if (!responseText) {
            return { success: false, error: 'No response from AI' }
        }

        const parsed = JSON.parse(responseText)
        const intentDef = INTENT_DEFINITIONS[parsed.intent as keyof typeof INTENT_DEFINITIONS]

        const result: IntentResult = {
            intent: parsed.intent,
            confidence: parsed.confidence,
            extractedEntities: parsed.extractedEntities || {},
            suggestedTeam: intentDef?.team,
            suggestedSkills: intentDef?.skills || []
        }

        return { success: true, result }
    } catch (error: any) {
        console.error('[IntentDetection] Failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Keyword-based intent detection (fallback)
 */
export function detectIntentKeywords(messageContent: string): IntentResult {
    const text = messageContent.toLowerCase()

    let bestMatch = 'general_inquiry'
    let maxScore = 0

    for (const [intent, def] of Object.entries(INTENT_DEFINITIONS)) {
        const score = def.keywords.filter(kw => text.includes(kw)).length
        if (score > maxScore) {
            maxScore = score
            bestMatch = intent
        }
    }

    const intentDef = INTENT_DEFINITIONS[bestMatch as keyof typeof INTENT_DEFINITIONS]

    return {
        intent: bestMatch,
        confidence: maxScore > 0 ? Math.min(0.9, 0.5 + (maxScore * 0.1)) : 0.5,
        extractedEntities: {},
        suggestedTeam: intentDef.team,
        suggestedSkills: intentDef.skills
    }
}

/**
 * Save intent to database
 */
export async function saveIntent(
    conversationId: string,
    messageId: string,
    result: IntentResult
) {
    "use server"
    const { error } = await supabaseAdmin
        .from('conversation_intents')
        .insert({
            conversation_id: conversationId,
            message_id: messageId,
            intent: result.intent,
            confidence: result.confidence,
            extracted_entities: result.extractedEntities,
            suggested_team: result.suggestedTeam,
            suggested_agent_skills: result.suggestedSkills
        })

    if (error) {
        console.error('[IntentDetection] Failed to save:', error)
    }
}

/**
 * Apply intent-based routing
 */
export async function applyIntentRouting(
    conversationId: string,
    organizationId: string,
    intent: string,
    confidence: number
) {
    "use server"
    // Find matching routing rule
    const { data: rules } = await supabaseAdmin
        .from('intent_routing_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('intent', intent)
        .eq('is_active', true)
        .gte('min_confidence', confidence)
        .limit(1)
        .single()

    if (!rules) {
        console.log(`[IntentRouting] No rule found for intent: ${intent}`)
        return
    }

    // Build update object
    const updates: any = {}

    if (rules.add_tags && rules.add_tags.length > 0) {
        const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('tags')
            .eq('id', conversationId)
            .single()

        const existingTags = conv?.tags || []
        updates.tags = [...new Set([...existingTags, ...rules.add_tags])]
    }

    if (rules.set_priority) {
        updates.priority = rules.set_priority
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
        await supabaseAdmin
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)

        console.log(`[IntentRouting] Applied routing for ${intent}:`, updates)
    }

    // Mark as auto-routed
    await supabaseAdmin
        .from('conversation_intents')
        .update({ auto_routed: true })
        .eq('conversation_id', conversationId)
        .eq('intent', intent)
}
