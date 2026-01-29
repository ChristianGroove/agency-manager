
import { describe, it, expect, beforeAll } from 'vitest';
import { IntentService } from '../intent-service';
import { resolveAssistantContext } from '../context-resolver';
import { IntentExecutor } from '../intent-executor';
import { createClient } from '@supabase/supabase-js'; // Use admin client for verification
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

// Setup Admin Client for Test Setup
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Assistant Actions Verification', () => {
    let context: any;
    let logId: string;
    let createdBriefId: string;

    // 1. Setup Context
    beforeAll(async () => {
        // Fetch valid user/org
        const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
        if (!org) throw new Error("No organization found");

        const { data: member } = await supabase.from('organization_members')
            .select('user_id')
            .eq('organization_id', org.id)
            .limit(1) as any;

        if (!member || !member[0]) throw new Error("No member found");

        // Mock Context
        context = {
            tenant_id: org.id,
            space_id: org.id,
            user_id: member[0].user_id,
            role: 'owner',
            allowed_actions: [],
            active_modules: ['core'],
            vertical: 'agency'
        };
    });

    it('should PROPOSE a create_brief intent', async () => {
        const result = await IntentService.proposeIntent(
            'create_brief',
            { client_id: context._test_client_id, title: 'Test Brief 001', description: 'Idempotency Test' },
            context,
            supabase // Inject admin client to bypass RLS in test runner if needed
        );

        expect(result.status).toBe('proposed');
        expect(result.log_id).toBeDefined();
        logId = result.log_id!;
    });



    it('should EXECUTE the intent after confirmation', async () => {
        // Manually confirm logic (Simulate User Button Press)
        await supabase.from('assistant_intent_logs')
            .update({ status: 'confirmed' })
            .eq('id', logId);

        // Execute
        try {
            const result = await IntentExecutor.execute(logId, context, supabase);
            expect(result.status).toBe('executed');
            expect(result.result.brief_id).toBeDefined();
            createdBriefId = result.result.brief_id;
        } catch (e: any) {
            console.error("TEST EXECUTION FAILED:", e.message);
            console.error("STACK:", e.stack);
            throw e;
        }
    });

    it('should REFUSE to Execute if NOT Confirmed', async () => {
        // New Proposal
        const prop = await IntentService.proposeIntent('create_brief', { client_id: 'x', title: 'y' }, context, supabase);

        // Try Executing immediately (Status: proposed)
        await expect(IntentExecutor.execute(prop.log_id!, context, supabase))
            .rejects.toThrow(/Required: 'confirmed'/);
    });

    it('should be IDEMPOTENT (Second Execution returns cached result)', async () => {
        console.log("   🔄 Testing Idempotency on Log:", logId);

        const result = await IntentExecutor.execute(logId, context, supabase);

        expect(result.status).toBe('executed');
        expect(result.result.brief_id).toBe(createdBriefId); // Same ID verify
    });

    it('should CANCEL a proposed intent', async () => {
        // 1. Propose
        const prop = await IntentService.proposeIntent('create_brief', { client_id: 'cancel_test', title: 'To Be Cancelled' }, context, supabase);



        // 2. Cancel
        const result = await IntentExecutor.cancel(prop.log_id!, context, supabase);
        expect(result.status).toBe('cancelled');

        // 3. Verify DB Status
        const { data: log } = await supabase.from('assistant_intent_logs').select('status').eq('id', prop.log_id).single();
        expect(log?.status).toBe('cancelled');

        // 4. Verify Execution Blocked
        await expect(IntentExecutor.execute(prop.log_id!, context, supabase))
            .rejects.toThrow(/Current status: 'cancelled'/);
    });

    // --- REMINDER TESTS ---
    // Using Mock Client to bypass Schema Cache issues with 'invoices' table in test environment

    it('should EXECUTE send_payment_reminder (Simulated)', async () => {
        // Mock Success
        const mockClient = {
            from: (table: string) => {
                // Intercept Log Updates (Executor updates logs)
                if (table === 'assistant_intent_logs') return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'log_123', status: 'confirmed', intent_id: 'send_payment_reminder', user_id: context.user_id, space_id: context.space_id }, error: null }) }) }),
                    update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) })
                };

                return {
                    select: (cols: string) => ({
                        eq: (field: string, val: string) => ({
                            eq: (field2: string, val2: string) => ({
                                single: async () => ({
                                    data: { id: 'inv_123', status: 'pending', client_id: 'cl_1', total_amount: 1000, due_date: '2023-01-01' },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
        };

        // 1. Propose (Real DB for Logs)
        const prop = await IntentService.proposeIntent(
            'send_payment_reminder',
            { invoice_id: 'inv_123' },
            context,
            supabase
        );

        // 2. Confirm (Real DB for Logs)
        await supabase.from('assistant_intent_logs')
            .update({ status: 'confirmed' })
            .eq('id', prop.log_id);

        // 3. Execute with Mock Client
        // Note: IntentExecutor fetches the log from DB. Since we pass mockClient, it will try to fetch log from mockClient.
        // We need to ensure logic flow works.
        // Actually, for this specific test, we should rely on real DB for Log fetching if possible, OR fully mock.
        // Given Phase 1 we mocked "actions", but here Executor needs DB access.
        // Hybrid approach: We can't easily hybridize with current DI.
        // Valid approach: Use Real `supabase` for Executor logic, but Mock injected into Action?
        // Current Executor implementation passes `injectedClient` to Action.

        // Let's rely on Real DB for Executor, but `sendPaymentReminderAction` needs to receive the mock.
        // The Executor does: `result = await sendPaymentReminderAction(..., supabase)`
        // So if we pass `supabase` (real) to Executor, the Action gets `supabase` (real) and fails on `invoices`.

        // Solution: This test needs to be skipped or fully mocked including the Log fetch.
        // For now, I will comment out the Reminder test execution via Executor or adapt the mock to simulate both Log and Invoice tables.

        // Let's try adaptable mock.

        const hybridMock = {
            from: (table: string) => {
                if (table === 'assistant_intent_logs') {
                    // Pass-through to real supabase? No, simple return mock data for log
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: prop.log_id,
                                        status: 'confirmed',
                                        intent_id: 'send_payment_reminder',
                                        user_id: context.user_id,
                                        space_id: context.space_id,
                                        payload: { invoice_id: 'inv_123' }
                                    },
                                    error: null
                                })
                            })
                        }),
                        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) })
                    };
                }
                // Invoice Mock
                return {
                    select: (cols: string) => ({
                        eq: (field: string, val: string) => ({
                            eq: (field2: string, val2: string) => ({
                                single: async () => ({
                                    data: { id: 'inv_123', status: 'pending', client_id: 'cl_1', total_amount: 1000, due_date: '2023-01-01' },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
        };

        const result = await IntentExecutor.execute(prop.log_id!, context, hybridMock as any);
        expect(result.status).toBe('executed');
    });

    it('should FAIL to remind PAID invoice', async () => {
        // Mock Paid Invoice
        const hybridMock = {
            from: (table: string) => {
                if (table === 'assistant_intent_logs') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: 'log_paid',
                                        status: 'confirmed',
                                        intent_id: 'send_payment_reminder',
                                        user_id: context.user_id,
                                        space_id: context.space_id,
                                        payload: { invoice_id: 'inv_paid' }
                                    },
                                    error: null
                                })
                            })
                        }),
                        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) })
                    };
                }
                return {
                    select: (cols: string) => ({
                        eq: (field: string, val: string) => ({
                            eq: (field2: string, val2: string) => ({
                                single: async () => ({
                                    data: { id: 'inv_paid', status: 'paid', client_id: 'cl_1', total_amount: 500, due_date: '2023-01-01' },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
        };

        // 3. Execute (Expect Failure via Mock)
        await expect(IntentExecutor.execute('log_paid', context, hybridMock as any))
            .rejects.toThrow(/Invoice is already PAID/);
    });
});
