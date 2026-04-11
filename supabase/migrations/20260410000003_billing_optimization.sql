-- 🏎️ 20260410000003_billing_optimization.sql
-- Optimizing Billing Arithmetic and Rule Resolution

-- 1. Index for Rule Resolution Speed
-- Covers: (reseller_org_id, phase_start_month, effective_from)
-- Note: CURRENT_DATE cannot be used in partial index predicates (not IMMUTABLE).
CREATE INDEX IF NOT EXISTS idx_revenue_rules_fast_lookup 
ON public.revenue_share_rules (reseller_org_id, phase_start_month, effective_from);

-- 2. Index for Activity Checking
-- Covers: (reseller_org_id, client_org_id, activity_date)
CREATE INDEX IF NOT EXISTS idx_reseller_log_activity_lookup 
ON public.reseller_activity_log (reseller_org_id, client_org_id, activity_date DESC);

-- 3. Optimization of calculate_event_commission 
-- (Ensuring search order is efficient and use current date once)
CREATE OR REPLACE FUNCTION public.calculate_event_commission(p_event_id uuid) RETURNS TABLE(commission_amount numeric, rule_id uuid, phase_name text, client_age_months integer, calculation_note text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_event RECORD;
    v_client RECORD;
    v_age_months INTEGER;
    v_rule RECORD;
    v_has_activity BOOLEAN;
    v_reseller_id UUID;
    v_now_date DATE := CURRENT_DATE;
BEGIN
    -- 1. Get Event
    SELECT * INTO v_event FROM public.billable_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'error'::TEXT, 0, 'Evento no encontrado';
        RETURN;
    END IF;

    -- 2. Get Client Identity
    SELECT id, acquired_by_reseller_id, acquisition_date
    INTO v_client
    FROM public.organizations
    WHERE id = v_event.organization_id;

    IF v_client.acquired_by_reseller_id IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'direct_client'::TEXT, 0, 'Cliente directo - sin comisi??n';
        RETURN;
    END IF;

    v_reseller_id := v_client.acquired_by_reseller_id;

    -- 3. Calculate Age in Months
    v_age_months := COALESCE(
        GREATEST(0,
            EXTRACT(YEAR FROM age(v_event.event_date, v_client.acquisition_date)) * 12 +
            EXTRACT(MONTH FROM age(v_event.event_date, v_client.acquisition_date))
        )::INTEGER, 
        0
    );

    -- 4. Fast Rule Lookup (Using Optimized Index)
    SELECT * INTO v_rule
    FROM public.revenue_share_rules
    WHERE (reseller_org_id = v_reseller_id OR reseller_org_id IS NULL)
      AND v_age_months >= phase_start_month
      AND (phase_end_month IS NULL OR v_age_months <= phase_end_month)
      AND v_event.event_type = ANY(eligible_event_types)
      AND (effective_to IS NULL OR effective_to >= v_now_date)
      AND effective_from <= v_now_date
    ORDER BY
        reseller_org_id NULLS LAST,
        phase_start_month DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'no_eligible_rule'::TEXT, v_age_months,
            format('Evento tipo %s no elegible en mes %s', v_event.event_type, v_age_months);
        RETURN;
    END IF;

    -- 5. Activity Check (Fast Scan)
    IF v_rule.requires_reseller_activity THEN
        SELECT EXISTS(
            SELECT 1 FROM public.reseller_activity_log
            WHERE reseller_org_id = v_reseller_id
              AND client_org_id = v_client.id
              AND activity_date >= (v_event.event_date - (v_rule.activity_window_days || ' days')::INTERVAL)
        ) INTO v_has_activity;

        IF NOT v_has_activity THEN
            RETURN QUERY SELECT 0::DECIMAL(10,2), v_rule.id, v_rule.phase_name || '_no_activity', v_age_months,
                format('Sin actividad en ??ltimos %s d??as', v_rule.activity_window_days);
            RETURN;
        END IF;
    END IF;

    -- 6. Commission Calculation
    RETURN QUERY SELECT
        ROUND(v_event.amount * (v_rule.commission_percent / 100), 2)::DECIMAL(10,2),
        v_rule.id,
        v_rule.phase_name,
        v_age_months,
        format('Comisi??n %s%% aplicada (Fase: %s, Mes: %s)',
            v_rule.commission_percent, v_rule.phase_name, v_age_months);
END;
$$;
