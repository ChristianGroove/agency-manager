import { describe, it, expect, beforeAll } from 'vitest';
import { IntentService } from '../intent-service';
import { createClient } from '@supabase/supabase-js';
import { AssistantContext } from '../types';
import dotenv from 'dotenv';
import path from 'path';

// Load Environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup Real Client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Env Vars for Test");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MOCK_CONTEXT: AssistantContext = {
    tenant_id: 'e3940176-508b-4f9e-a615-5606ce598e98', // Sandbox Org
    space_id: 'agency',
    user_id: 'd9b07172-132b-4275-a05e-855c829e3427', // Mock User
    role: 'owner',
    allowed_actions: [],
    active_modules: ['core', 'crm'],
    vertical: 'agency'
};

describe('Pixy Governance Layer', () => {

    it('should PROPOSE high risk intents (create_brief)', async () => {
        const result = await IntentService.proposeIntent(
            'create_brief',
            { client_id: '123' },
            MOCK_CONTEXT,
            supabase
        );

        expect(result.status).toBe('proposed');
        expect(result.risk_level).toBe('high');
        expect(result.requires_confirmation).toBe(true);
        expect(result.log_id).toBeDefined();
    });

    it('should CONFIRM low risk intents (list_pending_payments)', async () => {
        const result = await IntentService.proposeIntent(
            'list_pending_payments',
            {},
            MOCK_CONTEXT,
            supabase
        );

        expect(result.status).toBe('confirmed');
        expect(result.risk_level).toBe('low');
        expect(result.requires_confirmation).toBe(false);
        expect(result.log_id).toBeDefined();
    });

    it('should REJECT invalid intents or contexts', async () => {
        const badContext = { ...MOCK_CONTEXT, space_id: 'clinic', vertical: 'healthcare' }; // Agency intent in Clinic space

        const result = await IntentService.proposeIntent(
            'create_brief',
            {},
            badContext,
            supabase
        );

        expect(result.status).toBe('rejected');
    });

    it('should AUDIT logs to database', async () => {
        // Run a proposal
        const result = await IntentService.proposeIntent('list_pending_payments', {}, MOCK_CONTEXT, supabase);

        // Check DB
        expect(result.log_id).toBeDefined();
    });

});
