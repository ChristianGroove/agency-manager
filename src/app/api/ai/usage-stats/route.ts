import { NextResponse } from 'next/server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // Get usage logs from last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: logs, error } = await supabase
            .from('ai_usage_logs')
            .select('task_type, provider_id, input_tokens, output_tokens, status')
            .eq('organization_id', orgId)
            .gte('created_at', thirtyDaysAgo.toISOString())

        if (error) throw error

        // Aggregate stats
        const totalTokens = logs?.reduce((acc, log) =>
            acc + (log.input_tokens || 0) + (log.output_tokens || 0), 0) || 0

        // Estimate cost ($0.002 per 1K tokens average)
        const estimatedCost = (totalTokens / 1000) * 0.002

        // By task type
        const taskMap = new Map<string, { tokens: number; calls: number }>()
        logs?.forEach(log => {
            const existing = taskMap.get(log.task_type) || { tokens: 0, calls: 0 }
            taskMap.set(log.task_type, {
                tokens: existing.tokens + (log.input_tokens || 0) + (log.output_tokens || 0),
                calls: existing.calls + 1
            })
        })

        const byTask = Array.from(taskMap.entries()).map(([task, data]) => ({
            task,
            tokens: data.tokens,
            calls: data.calls
        })).sort((a, b) => b.tokens - a.tokens)

        // By provider
        const providerMap = new Map<string, { tokens: number; success: number; total: number }>()
        logs?.forEach(log => {
            const existing = providerMap.get(log.provider_id) || { tokens: 0, success: 0, total: 0 }
            providerMap.set(log.provider_id, {
                tokens: existing.tokens + (log.input_tokens || 0) + (log.output_tokens || 0),
                success: existing.success + (log.status === 'success' ? 1 : 0),
                total: existing.total + 1
            })
        })

        const byProvider = Array.from(providerMap.entries()).map(([provider, data]) => ({
            provider,
            tokens: data.tokens,
            successRate: data.total > 0 ? (data.success / data.total) * 100 : 0
        }))

        return NextResponse.json({
            success: true,
            stats: {
                totalTokens,
                estimatedCost,
                byTask,
                byProvider
            }
        })

    } catch (error: any) {
        console.error('[Usage Stats API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
