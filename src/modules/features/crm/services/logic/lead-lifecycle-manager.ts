import { SupabaseClient } from '@supabase/supabase-js';
import { ContactRepository } from '../contact-repository';
import { calculateLeadScore } from './scoring';

/**
 * LeadLifecycleManager
 * Centralizes CRM logic reactions to messaging events (Inbox).
 * Designed for high scalability and zero infrastructure cost.
 */
export class LeadLifecycleManager {
    private repo: ContactRepository;

    constructor(private supabase: SupabaseClient) {
        this.repo = new ContactRepository(supabase);
    }

    /**
     * Processes activity for a lead when a message is received.
     * Updates timestamps, elevates status, and triggers re-scoring.
     */
    async handleLeadIncomingActivity(leadId: string, orgId: string): Promise<void> {
        try {
            // 1. Fetch current minimal state to decide transitions
            const lead = await this.repo.findById(leadId, orgId);
            if (!lead) return;

            const updates: Record<string, any> = {
                last_activity_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 2. Automatic Lifecycle Transition: New -> Contacted
            if (lead.status === 'new') {
                updates.status = 'contacted';
            }

            // 3. Execute Update
            await this.repo.update(leadId, updates, orgId);

            // 4. Reactive Scoring (Non-blocking background execution)
            // We don't await this to keep the inbox response fast
            this.triggerReScoring(leadId, orgId);

        } catch (error) {
            console.error('[LEAD_LIFECYCLE_MANAGER] Error processing activity:', error);
        }
    }

    /**
     * Background re-scoring execution
     */
    private async triggerReScoring(leadId: string, orgId: string): Promise<void> {
        try {
            const result = await calculateLeadScore(leadId);
            // Persistence is handled inside calculateLeadScore if it updates the DB, 
            // or we do it here if needed. 
            // Note: scoring.ts currently returns the score but doesn't persist it.
            // We update the lead record with the new score.
            await this.repo.update(leadId, { score: result.score }, orgId);
        } catch (error) {
            console.error('[LEAD_LIFECYCLE_MANAGER] Scoring failed:', error);
        }
    }
}
