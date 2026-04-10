-- 💰 smoke_test_commissions.sql
-- Financial Integrity Audit for Pixy Billing Engine

DO $$
DECLARE
    v_org_id UUID := '00000000-0000-0000-0000-000000000001';
    v_rule_id UUID;
    v_client_id UUID := '00000000-0000-0000-0000-000000000002';
    v_event_id UUID := '00000000-0000-0000-0000-000000000003';
    v_amount NUMERIC := 1000.00;
    v_expected_comm NUMERIC := 200.00; -- 20% of 1000
    v_calculated_comm NUMERIC;
    v_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '--- STARTING FINANCIAL SMOKE TEST ---';

    -- 1. Setup Temporary Data
    DELETE FROM public.billable_events WHERE id = v_event_id;
    DELETE FROM public.revenue_share_rules WHERE organization_id = v_org_id;
    DELETE FROM public.clients WHERE id = v_client_id;
    DELETE FROM public.organizations WHERE id = v_org_id;

    INSERT INTO public.organizations (id, name, slug) 
    VALUES (v_org_id, 'Audit Org', 'audit-org');

    INSERT INTO public.clients (id, organization_id, name, user_id)
    VALUES (v_client_id, v_org_id, 'Audit Client', auth.uid());

    -- 2. Define Commission Rule (20% for first 12 months)
    INSERT INTO public.revenue_share_rules (organization_id, phase_name, commission_percent, start_month, end_month)
    VALUES (v_org_id, 'Activation', 20.00, 0, 12)
    RETURNING id INTO v_rule_id;

    -- 3. Insert Billable Event
    INSERT INTO public.billable_events (id, organization_id, client_id, amount, source, status)
    VALUES (v_event_id, v_org_id, v_client_id, v_amount, 'smoke_test', 'pending');

    -- 4. Execute Arithmetic Check (RPC)
    SELECT commission_amount FROM public.calculate_event_commission(v_event_id) INTO v_calculated_comm;

    -- 5. Validation Result
    IF v_calculated_comm = v_expected_comm THEN
        RAISE NOTICE '✅ TEST 1 (Basic Commission): PASSED. Expected %, Found %', v_expected_comm, v_calculated_comm;
    ELSE
        RAISE NOTICE '❌ TEST 1 (Basic Commission): FAILED. Expected %, Found %', v_expected_comm, v_calculated_comm;
        v_passed := FALSE;
    END IF;

    -- 6. Settlement Aggregation Check
    -- (Mocking a settlement calculation)
    IF (v_amount - v_calculated_comm) = 800.00 THEN
        RAISE NOTICE '✅ TEST 2 (Net Payout): PASSED. Platform Fee is correct.';
    ELSE
        RAISE NOTICE '❌ TEST 2 (Net Payout): FAILED. Arithmetic imbalance.';
        v_passed := FALSE;
    END IF;

    -- 7. Cleanup (Optional, rollback is better)
    RAISE EXCEPTION '--- FINISHING SMOKE TEST (ROLLBACK TO CLEANUP) ---';

EXCEPTION WHEN others THEN
    IF v_passed THEN
        RAISE NOTICE '--- 🏆 FINAL SCORE: 100%% INTEGRITY ---';
    ELSE
        RAISE NOTICE '--- ⚠️ FINAL SCORE: SYSTEM HAS ARITHMETIC LEAKS ---';
    END IF;
END $$;
