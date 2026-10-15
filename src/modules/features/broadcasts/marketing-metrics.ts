export interface CampaignMetrics {
    channel?: 'whatsapp' | 'email'
    channelHealth?: { ready: boolean; quality: string | null; checkedAt: string | null; holdCode: number | null; holdAt: string | null; holdUntil: string | null }
    runtime?: { startedAt: string; finishedAt: string | null; status: 'running' | 'success' | 'failed' } | null
    runtimeUnavailable?: boolean
    stats: { total: number; active: number; completed: number; failed: number; cancelled: number }
    delivery: { queued: number; sending: number; accepted: number; delivered: number; read: number; failed: number; unknown: number }
    recentActivity: Array<{
        id: string; status: string; last_updated: string | null; last_error: string | null
        lead: { name: string | null; phone: string | null }; last_log: any
    }>
}
