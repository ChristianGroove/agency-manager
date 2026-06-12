import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntentService } from '../intent-service';
import { createClient } from '@supabase/supabase-js';
import { AssistantContext } from '../types';
import dotenv from 'dotenv';
import path from 'path';

// Load Environment
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

// Setup Real Client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RUN_ASSISTANT_DB_TESTS = process.env.RUN_ASSISTANT_DB_TESTS === 'true';
const describeAssistantDb = RUN_ASSISTANT_DB_TESTS ? describe : describe.skip;

if (RUN_ASSISTANT_DB_TESTS && (!SUPABASE_URL || !SUPABASE_KEY)) {
    throw new Error("Missing Env Vars for Test");
}

const supabase = RUN_ASSISTANT_DB_TESTS
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null as any;

// Opt-in only: this suite writes to the configured Supabase project and requires seeded organizations.
describeAssistantDb('Pixy Governance Layer', () => {
    let context: AssistantContext;
    const createdLogIds: string[] = [];

    beforeAll(async () => {
        const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
        if (!org) throw new Error("No organization found");

        const { data: member } = await supabase.from('organization_members')
            .select('user_id')
            .eq('organization_id', org.id)
            .limit(1) as any;

        if (!member || !member[0]) throw new Error("No member found");

        context = {
            tenant_id: org.id,
            space_id: org.id,
            user_id: member[0].user_id,
            role: 'owner',
            allowed_actions: [],
            active_modules: ['core', 'crm'],
            vertical: 'agency'
        };
    });

    afterAll(async () => {
        if (createdLogIds.length > 0) {
            await supabase.from('assistant_intent_logs').delete().in('id', createdLogIds);
        }
    });

    function recordLogId(logId?: string) {
        expect(logId).toMatch(/^[0-9a-f-]{36}$/);
        createdLogIds.push(logId!);
    }

    it('should PROPOSE high risk intents (create_brief)', async () => {
        const result = await IntentService.proposeIntent(
            'create_brief',
            { client_id: '123' },
            context,
            supabase
        );

        expect(result.status).toBe('proposed');
        expect(result.risk_level).toBe('high');
        expect(result.requires_confirmation).toBe(true);
        recordLogId(result.log_id);
    });

    it('should CONFIRM low risk intents (list_pending_payments)', async () => {
        const result = await IntentService.proposeIntent(
            'list_pending_payments',
            {},
            context,
            supabase
        );

        expect(result.status).toBe('confirmed');
        expect(result.risk_level).toBe('low');
        expect(result.requires_confirmation).toBe(false);
        recordLogId(result.log_id);
    });

    it('should REJECT invalid intents or contexts', async () => {
        const badContext = { ...context, vertical: 'healthcare' }; // Agency intent in healthcare vertical

        const result = await IntentService.proposeIntent(
            'create_brief',
            {},
            badContext,
            supabase
        );

        expect(result.status).toBe('rejected');
        recordLogId(result.log_id);
    });

    it('should AUDIT logs to database', async () => {
        // Run a proposal
        const result = await IntentService.proposeIntent('list_pending_payments', {}, context, supabase);

        // Check DB
        recordLogId(result.log_id);

        const { data, error } = await supabase
            .from('assistant_intent_logs')
            .select('id,status,intent_id')
            .eq('id', result.log_id)
            .single();

        expect(error).toBeNull();
        expect(data).toMatchObject({
            id: result.log_id,
            status: 'confirmed',
            intent_id: 'list_pending_payments'
        });
    });

});
