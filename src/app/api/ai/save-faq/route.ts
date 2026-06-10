import { NextRequest, NextResponse } from 'next/server'
import { saveFAQ } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { aiRouteErrorMessage, logAiRouteError } from '../_error-utils'

const MAX_QUESTION_LENGTH = 1_000
const MAX_ANSWER_LENGTH = 10_000
const MAX_CATEGORY_LENGTH = 100
const PUBLIC_SAVE_FAQ_ERROR = 'FAQ save failed'

export async function POST(req: NextRequest) {
    try {
        const faq = await req.json()

        if (
            typeof faq?.question !== 'string' ||
            typeof faq?.answer !== 'string' ||
            !faq.question.trim() ||
            !faq.answer.trim()
        ) {
            return NextResponse.json(
                { success: false, error: 'question and answer are required' },
                { status: 400 }
            )
        }

        if (faq.question.length > MAX_QUESTION_LENGTH || faq.answer.length > MAX_ANSWER_LENGTH) {
            return NextResponse.json(
                { success: false, error: 'FAQ content is too long' },
                { status: 413 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const result = await saveFAQ({
            question: faq.question.trim(),
            answer: faq.answer.trim(),
            category: typeof faq.category === 'string' && faq.category.trim()
                ? faq.category.trim().slice(0, MAX_CATEGORY_LENGTH)
                : 'general'
        })

        return NextResponse.json(result)

    } catch (error: any) {
        logAiRouteError('[Save FAQ API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_SAVE_FAQ_ERROR) },
            { status: 500 }
        )
    }
}
