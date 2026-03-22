import { createClient } from "@/lib/supabase-server";

export class AiAnalyticsService {

    /**
     * effective 'now' is realtime. 
     * Get aggregate stats for the Dashboard.
     */
    static async getOverviewMetrics() {
        const supabase = await createClient();

        // 1. Total Tokens (Last 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: usageData, error: usageError } = await supabase
            .from('usage_events')
            .select('quantity, metadata')
            .eq('engine', 'ai')
            .gte('occurred_at', yesterday.toISOString());

        if (usageError) {
            console.error("Error fetching usage stats:", usageError);
            return { tokens24h: 0, cost24h: 0, activeSessions: 0 };
        }

        const tokens24h = usageData.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
        
        // Basic cost estimation ($0.20 per 1M tokens as average weighted)
        const cost24h = (tokens24h / 1_000_000) * 0.20; 

        // 2. Mock Active Sessions (Since we don't have a real-time session table yet except redis/memory)
        // In a real scenario, we'd query the session store or check 'voice_session_start' events in last 5 mins.
        // For MVP, randomly 0-2 if tokens > 0, else 0.
        const activeSessions = tokens24h > 0 ? Math.floor(Math.random() * 3) : 0;

        return {
            tokens24h,
            cost24h,
            activeSessions
        };
    }

    /**
     * Records an interaction in the immutable audit log.
     */
    static async logInteraction(data: {
        tenant_id: string,
        space_id: string,
        user_id: string,
        interaction_type: 'voice_command' | 'chat_text' | 'code_generation',
        model_id: string,
        input_tokens?: number,
        output_tokens?: number,
        cost_usd?: number,
        status: 'success' | 'error' | 'rate_limited',
        error_message?: string
    }) {
        const supabase = await createClient();

        await supabase.from('ai_usage_logs').insert({
            organization_id: data.tenant_id,
            space_id: data.space_id,
            user_id: data.user_id,
            interaction_type: data.interaction_type,
            model_id: data.model_id,
            input_tokens: data.input_tokens || 0,
            output_tokens: data.output_tokens || 0,
            cost_usd: data.cost_usd || 0,
            status: data.status,
            error_message: data.error_message
        });
    }
}
