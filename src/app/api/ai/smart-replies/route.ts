import { NextRequest, NextResponse } from 'next/server'
import { generateSmartReplies, logSuggestion } from '@/modules/core/messaging/ai/smart-replies'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
    try {
        const { conversationId } = await req.json()

        if (!conversationId) {
            return NextResponse.json(
                { success: false, error: 'conversationId required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Fetch conversation history (last 10 messages)
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('content, direction, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (messagesError) {
            return NextResponse.json(
                { success: false, error: messagesError.message },
                { status: 500 }
            )
        }

        // Fetch conversation context
        const { data: conversation } = await supabase
            .from('conversations')
            .select('priority, tags, leads(name)')
            .eq('id', conversationId)
            .single()

        // Reverse to get chronological order
        const conversationHistory = messages.reverse().map(m => ({
            content: m.content,
            direction: m.direction as 'incoming' | 'outgoing',
            created_at: m.created_at
        }))

        // Generate AI replies
        const result = await generateSmartReplies({
            conversationHistory,
            customerContext: {
                name: conversation?.leads?.name || undefined,
                tags: conversation?.tags || [],
                priority: conversation?.priority || undefined
            },
            businessContext: 'You are a customer service representative for an agency management platform.'
        })

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            )
        }

        // Log suggestion for analytics
        if (result.replies && messages[messages.length - 1]) {
            await logSuggestion({
                conversationId,
                messageId: messages[messages.length - 1].id,
                suggestions: result.replies,
                generationTimeMs: result.generationTimeMs || 0
            })
        }

        return NextResponse.json({
            success: true,
            replies: result.replies,
            generationTimeMs: result.generationTimeMs
        })
    } catch (error: any) {
        console.error('[SmartReplies API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
