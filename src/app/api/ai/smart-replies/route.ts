import { NextRequest, NextResponse } from 'next/server'
import { generateSmartReplies, logSuggestion } from '@/modules/features/messaging/messaging-actions'
import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { aiRouteErrorMessage, logAiRouteError, logAiRouteWarning } from '../_error-utils'

const PUBLIC_SMART_REPLIES_ERROR = 'Smart replies failed'
const PUBLIC_SMART_REPLIES_MESSAGES_ERROR = 'Conversation messages unavailable'

export async function POST(req: NextRequest) {
    try {
        const { conversationId } = await req.json()

        if (typeof conversationId !== 'string' || !conversationId.trim()) {
            return NextResponse.json(
                { success: false, error: 'conversationId required' },
                { status: 400 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const normalizedConversationId = conversationId.trim()
        const supabase = await createClient()

        // Fetch conversation context first to prove tenant ownership before AI work.
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('priority, tags, leads(id, name)')
            .eq('id', normalizedConversationId)
            .eq('organization_id', orgId)
            .single()

        if (conversationError || !conversation) {
            return NextResponse.json(
                { success: false, error: 'Conversation not found' },
                { status: 404 }
            )
        }

        // Fetch conversation history (last 10 messages)
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id, content, direction, created_at')
            .eq('conversation_id', normalizedConversationId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (messagesError) {
            logAiRouteError('[SmartReplies API] Messages fetch error:', messagesError)
            return NextResponse.json(
                { success: false, error: aiRouteErrorMessage(messagesError, PUBLIC_SMART_REPLIES_MESSAGES_ERROR) },
                { status: 500 }
            )
        }

        // Reverse to get chronological order
        const conversationMessages = messages || []
        const conversationHistory = conversationMessages.reverse().map(m => ({
            content: m.content,
            direction: m.direction as 'incoming' | 'outgoing',
            created_at: m.created_at
        }))

        // Fetch Process Engine Context
        let processContext = undefined
        const lead = Array.isArray(conversation?.leads) ? conversation?.leads[0] : (conversation?.leads as any)

        if (lead?.id) {
            try {
                const { ProcessEngine } = await import('@/modules/features/crm/services/process-engine/engine')
                const context = await ProcessEngine.getProcessContext(lead.id)
                if (context) {
                    processContext = {
                        state: context.state.name,
                        stateKey: context.state.key,
                        goal: context.state.metadata?.goal || 'Advance the sale',
                        description: context.state.description,
                        nextActions: context.state.allowed_next_states
                    }
                }
            } catch (error) {
                logAiRouteWarning("Failed to fetch process context for AI:", error)
            }
        }

        // Generate AI replies
        const result = await generateSmartReplies({
            conversationHistory,
            processContext,
            customerContext: {
                name: lead?.name,
                tags: conversation?.tags || [],
                priority: conversation?.priority || undefined
            },
            businessContext: 'You are a customer service representative for an agency management platform.'
        })

        if (!result.success) {
            logAiRouteError('[SmartReplies API] Generation failed:', result.error)
            return NextResponse.json(
                { success: false, error: aiRouteErrorMessage(result.error, PUBLIC_SMART_REPLIES_ERROR) },
                { status: 500 }
            )
        }

        // Log suggestion for analytics
        if (result.replies && conversationMessages[conversationMessages.length - 1]) {
            await logSuggestion({
                conversationId: normalizedConversationId,
                messageId: conversationMessages[conversationMessages.length - 1].id,
                suggestions: result.replies,
                generationTimeMs: result.generationTimeMs || 0
            })
        }

        return NextResponse.json({
            success: true,
            replies: result.replies,
            generationTimeMs: result.generationTimeMs,
            usedKnowledge: result.usedKnowledge
        })
    } catch (error: unknown) {
        logAiRouteError('[SmartReplies API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_SMART_REPLIES_ERROR) },
            { status: 500 }
        )
    }
}
