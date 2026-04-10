import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { ScoreFactors } from "@/types/crm-advanced";

/**
 * Unified Scoring Logic for CRM Leads
 * Calculates lead quality based on profile completeness, engagement, and pipeline progress.
 */
export async function calculateLeadScore(leadId: string): Promise<{
    score: number;
    factors: ScoreFactors;
    breakdown: Record<string, number>;
}> {
    // Get lead data
    const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) throw new Error("Lead not found");

    // Fetch engagement metrics from both simple and advanced modules
    const [
        { count: msgCount },
        { count: activityCount },
        { count: completedTasks },
        { count: emailsExchanged },
        { count: legacyCompletedTasks }
    ] = await Promise.all([
        supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', leadId),
        supabaseAdmin.from('lead_activities').select('id', { count: 'exact', head: true }).eq('lead_id', leadId),
        supabaseAdmin.from('lead_tasks').select('id', { count: 'exact', head: true }).eq('lead_id', leadId).eq('status', 'completed'),
        supabaseAdmin.from('lead_emails').select('id', { count: 'exact', head: true }).eq('lead_id', leadId),
        supabaseAdmin.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('lead_id', leadId).eq('status', 'completed')
    ]);

    let score = 0;
    const breakdown: Record<string, number> = {};
    const factors: ScoreFactors = {
        hasEmail: !!lead.email,
        hasPhone: !!lead.phone,
        hasCompany: !!lead.company_name,
        emailDomain: 'unknown',
        pipelineProgress: 0,
        engagement: 0
    };

    // 1. Profile Completeness (Max 30)
    let profileScore = 0;
    if (lead.email) {
        profileScore += 10;
        const domain = lead.email.split('@')[1];
        if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) {
            factors.emailDomain = 'business';
            profileScore += 5;
        } else {
            factors.emailDomain = 'personal';
        }
    }
    if (lead.phone) profileScore += 5;
    if (lead.company_name) profileScore += 5;
    if (lead.source === 'referral') profileScore += 5;
    if (lead.estimated_value && lead.estimated_value > 5000) profileScore += 5;

    breakdown.profile = profileScore;
    score += profileScore;

    // 2. Engagement (Max 45)
    let engagementScore = 0;
    
    // Weighted activities
    engagementScore += (msgCount || 0) * 2;         // 2 points per chat message
    engagementScore += (activityCount || 0) * 1;    // 1 point per general activity
    engagementScore += (completedTasks || 0) * 5;   // 5 points per adv task
    engagementScore += (legacyCompletedTasks || 0) * 3; // 3 points per legacy task
    engagementScore += (emailsExchanged || 0) * 3;  // 3 points per email

    // Recent Activity Bonus
    const lastUpdate = lead.last_activity_at || lead.updated_at;
    if (lastUpdate) {
        const daysSinceUpdate = (new Date().getTime() - new Date(lastUpdate).getTime()) / (1000 * 3600 * 24);
        if (daysSinceUpdate < 7) engagementScore += 10;
        else if (daysSinceUpdate < 30) engagementScore += 5;
        
        // --- PHASE 4: Inactivity Penalty (Cold Lead Decay) ---
        if (daysSinceUpdate > 30) {
            const penaltyWeeks = Math.floor((daysSinceUpdate - 30) / 7);
            const penalty = penaltyWeeks * 5; // -5 points per week of inactivity after 30 days
            const finalPenalty = Math.min(40, penalty); // Max penalty 40 points
            score -= finalPenalty;
            breakdown.inactivity_penalty = -finalPenalty;
        }
    }

    engagementScore = Math.min(45, engagementScore);
    factors.engagement = engagementScore;
    breakdown.engagement = engagementScore;
    score += engagementScore;

    // 3. Pipeline Progress (Max 25)
    let pipelineScore = 0;
    const statusPoints: Record<string, number> = {
        new: 0,
        contacted: 5,
        qualified: 15,
        negotiation: 20,
        won: 25,
        lost: 0
    };
    pipelineScore = statusPoints[lead.status as string] || 0;
    
    factors.pipelineProgress = pipelineScore;
    breakdown.status = pipelineScore;
    score += pipelineScore;

    // Final result
    score = Math.min(100, score);

    return { score, factors, breakdown };
}
