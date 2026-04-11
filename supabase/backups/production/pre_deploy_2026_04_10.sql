


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."appointment_status_enum" AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."appointment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."briefing_field_type" AS ENUM (
    'text',
    'textarea',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'date',
    'upload',
    'scale',
    'boolean',
    'color',
    'typography'
);


ALTER TYPE "public"."briefing_field_type" OWNER TO "postgres";


CREATE TYPE "public"."briefing_status" AS ENUM (
    'draft',
    'sent',
    'in_progress',
    'submitted',
    'locked'
);


ALTER TYPE "public"."briefing_status" OWNER TO "postgres";


CREATE TYPE "public"."channel_status" AS ENUM (
    'connected',
    'disconnected',
    'pending',
    'error'
);


ALTER TYPE "public"."channel_status" OWNER TO "postgres";


CREATE TYPE "public"."channel_type" AS ENUM (
    'whatsapp_cloud',
    'whatsapp_on_premise',
    'email',
    'sms'
);


ALTER TYPE "public"."channel_type" OWNER TO "postgres";


CREATE TYPE "public"."dian_status" AS ENUM (
    'EN_PROCESO',
    'ENVIADA',
    'ACEPTADA',
    'RECHAZADA',
    'CON_ERRORES',
    'CONTINGENCIA'
);


ALTER TYPE "public"."dian_status" OWNER TO "postgres";


CREATE TYPE "public"."emitter_type" AS ENUM (
    'NATURAL',
    'JURIDICO'
);


ALTER TYPE "public"."emitter_type" OWNER TO "postgres";


CREATE TYPE "public"."event_trigger_type" AS ENUM (
    'system',
    'user',
    'webhook'
);


ALTER TYPE "public"."event_trigger_type" OWNER TO "postgres";


CREATE TYPE "public"."knowledge_audience" AS ENUM (
    'staff',
    'customer',
    'both'
);


ALTER TYPE "public"."knowledge_audience" OWNER TO "postgres";


CREATE TYPE "public"."location_type_enum" AS ENUM (
    'at_headquarters',
    'at_client_address',
    'remote'
);


ALTER TYPE "public"."location_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_method_type" AS ENUM (
    'MANUAL',
    'GATEWAY'
);


ALTER TYPE "public"."payment_method_type" OWNER TO "postgres";


CREATE TYPE "public"."resto_session_status" AS ENUM (
    'active',
    'payment_pending',
    'closed'
);


ALTER TYPE "public"."resto_session_status" OWNER TO "postgres";


CREATE TYPE "public"."resto_table_shape" AS ENUM (
    'circle',
    'square',
    'rectangle',
    'oval'
);


ALTER TYPE "public"."resto_table_shape" OWNER TO "postgres";


CREATE TYPE "public"."resto_table_status" AS ENUM (
    'available',
    'occupied',
    'reserved',
    'cleaning',
    'billing'
);


ALTER TYPE "public"."resto_table_status" OWNER TO "postgres";


CREATE TYPE "public"."scheduled_job_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."scheduled_job_status" OWNER TO "postgres";


CREATE TYPE "public"."smtp_provider_type" AS ENUM (
    'gmail',
    'outlook',
    'office365',
    'zoho',
    'custom'
);


ALTER TYPE "public"."smtp_provider_type" OWNER TO "postgres";


CREATE TYPE "public"."snapshot_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'restoring',
    'archived'
);


ALTER TYPE "public"."snapshot_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'legacy_manual'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."workflow_role" AS ENUM (
    'viewer',
    'editor',
    'approver',
    'admin'
);


ALTER TYPE "public"."workflow_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_app RECORD;
    v_module RECORD;
    v_modules_to_enable TEXT[] := ARRAY[]::TEXT[];
    v_result JSONB;
BEGIN
    -- Get app details
    SELECT * INTO v_app
    FROM public.saas_apps
    WHERE id = p_app_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'App not found or inactive'
        );
    END IF;
    
    -- Update organization app assignment
    UPDATE public.organizations
    SET 
        active_app_id = p_app_id,
        app_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Collect modules to enable
    FOR v_module IN 
        SELECT module_key, auto_enable, is_optional
        FROM public.saas_app_modules
        WHERE app_id = p_app_id
        ORDER BY sort_order
    LOOP
        -- Auto-enable if:
        -- 1. auto_enable is true
        -- 2. OR is optional but p_enable_optional_modules is true
        IF v_module.auto_enable OR (v_module.is_optional AND p_enable_optional_modules) THEN
            v_modules_to_enable := array_append(v_modules_to_enable, v_module.module_key);
        END IF;
    END LOOP;
    
    -- Update organization manual_module_overrides
    -- (This will be processed by the module system)
    UPDATE public.organizations
    SET 
        manual_module_overrides = v_modules_to_enable,
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'app_id', p_app_id,
        'app_name', v_app.name,
        'modules_enabled', v_modules_to_enable
    );
END;
$$;


ALTER FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean) IS 'Assigns an app template to an organization and enables its modules';



CREATE OR REPLACE FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_to_activate TEXT[] := ARRAY[]::TEXT[];
    v_module RECORD;
    v_dep JSONB;
    v_nested_deps TEXT[];
BEGIN
    -- Get module
    SELECT * INTO v_module
    FROM public.system_modules
    WHERE key = p_module_key;
    
    IF NOT FOUND THEN
        RETURN v_to_activate;
    END IF;
    
    -- Check each dependency
    IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
        FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
        LOOP
            -- If required and not active, add to list
            IF (v_dep->>'type') = 'required' AND 
               NOT ((v_dep->>'module_key') = ANY(p_current_active_modules)) AND
               NOT ((v_dep->>'module_key') = ANY(v_to_activate)) THEN
                
                v_to_activate := array_append(v_to_activate, v_dep->>'module_key');
                
                -- Recursively check dependencies of dependencies
                v_nested_deps := public.auto_resolve_dependencies(
                    v_dep->>'module_key',
                    p_current_active_modules || v_to_activate
                );
                
                -- Add nested dependencies
                v_to_activate := v_to_activate || v_nested_deps;
            END IF;
        END LOOP;
    END IF;
    
    -- Remove duplicates
    SELECT ARRAY_AGG(DISTINCT module)
    INTO v_to_activate
    FROM unnest(v_to_activate) AS module;
    
    RETURN COALESCE(v_to_activate, ARRAY[]::TEXT[]);
END;
$$;


ALTER FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) IS 'Returns array of modules that need to be activated to satisfy dependencies';



CREATE OR REPLACE FUNCTION "public"."calculate_audit_hash"("p_id" "uuid", "p_timestamp" timestamp with time zone, "p_action" "text", "p_document_id" "uuid", "p_organization_id" "uuid", "p_previous_hash" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_previous_hash, '') ||
            p_id::TEXT ||
            p_timestamp::TEXT ||
            p_action ||
            COALESCE(p_document_id::TEXT, '') ||
            p_organization_id::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$;


ALTER FUNCTION "public"."calculate_audit_hash"("p_id" "uuid", "p_timestamp" timestamp with time zone, "p_action" "text", "p_document_id" "uuid", "p_organization_id" "uuid", "p_previous_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_cart_total"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    -- Update the parent cart's total_amount
    update public.deal_carts
    set 
        total_amount = (
            select coalesce(sum(quantity * unit_price), 0)
            from public.cart_items
            where cart_id = coalesce(new.cart_id, old.cart_id)
        ),
        updated_at = now()
    where id = coalesce(new.cart_id, old.cart_id);
    
    return null;
end;
$$;


ALTER FUNCTION "public"."calculate_cart_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") RETURNS TABLE("commission_amount" numeric, "rule_id" "uuid", "phase_name" "text", "client_age_months" integer, "calculation_note" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_event RECORD;
    v_client RECORD;
    v_age_months INTEGER;
    v_rule RECORD;
    v_has_activity BOOLEAN;
    v_reseller_id UUID;
BEGIN
    -- 1. Obtener evento
    SELECT * INTO v_event FROM public.billable_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'error'::TEXT, 0, 'Evento no encontrado';
        RETURN;
    END IF;
    
    -- 2. Obtener cliente y su reseller de adquisición
    SELECT 
        o.id,
        o.acquired_by_reseller_id,
        o.acquisition_date
    INTO v_client 
    FROM public.organizations o 
    WHERE o.id = v_event.organization_id;
    
    -- Si no tiene reseller, comisión = 0 (cliente directo)
    IF v_client.acquired_by_reseller_id IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'direct_client'::TEXT, 0, 'Cliente directo - sin comisión';
        RETURN;
    END IF;
    
    v_reseller_id := v_client.acquired_by_reseller_id;
    
    -- 3. Calcular antigüedad del cliente en meses
    IF v_client.acquisition_date IS NULL THEN
        v_age_months := 0;
    ELSE
        v_age_months := GREATEST(0, 
            EXTRACT(YEAR FROM age(v_event.event_date, v_client.acquisition_date)) * 12 +
            EXTRACT(MONTH FROM age(v_event.event_date, v_client.acquisition_date))
        )::INTEGER;
    END IF;
    
    -- 4. Buscar regla aplicable
    SELECT * INTO v_rule
    FROM public.revenue_share_rules
    WHERE (reseller_org_id = v_reseller_id OR reseller_org_id IS NULL)
      AND v_age_months >= phase_start_month
      AND (phase_end_month IS NULL OR v_age_months <= phase_end_month)
      AND v_event.event_type = ANY(eligible_event_types)
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      AND effective_from <= CURRENT_DATE
    ORDER BY 
        reseller_org_id NULLS LAST, -- Prioriza regla específica del reseller
        phase_start_month DESC      -- Prioriza fase más específica
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10,2), NULL::UUID, 'no_eligible_rule'::TEXT, v_age_months, 
            format('Evento tipo %s no elegible en mes %s', v_event.event_type, v_age_months);
        RETURN;
    END IF;
    
    -- 5. Verificar actividad si es requerida (Fase 2)
    IF v_rule.requires_reseller_activity THEN
        SELECT EXISTS(
            SELECT 1 FROM public.reseller_activity_log
            WHERE reseller_org_id = v_reseller_id
              AND client_org_id = v_client.id
              AND activity_date >= (v_event.event_date - (v_rule.activity_window_days || ' days')::INTERVAL)
        ) INTO v_has_activity;
        
        IF NOT v_has_activity THEN
            RETURN QUERY SELECT 0::DECIMAL(10,2), v_rule.id, v_rule.phase_name || '_no_activity', v_age_months,
                format('Sin actividad en últimos %s días', v_rule.activity_window_days);
            RETURN;
        END IF;
    END IF;
    
    -- 6. Calcular y retornar comisión
    RETURN QUERY SELECT 
        ROUND(v_event.amount * (v_rule.commission_percent / 100), 2)::DECIMAL(10,2),
        v_rule.id,
        v_rule.phase_name,
        v_age_months,
        format('Comisión %s%% aplicada (Fase: %s, Mes: %s)', 
            v_rule.commission_percent, v_rule.phase_name, v_age_months);
END;
$$;


ALTER FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") IS 'Calcula la comisión de un evento basado en reglas de fase. Retorna 0 para clientes directos o eventos no elegibles.';



CREATE OR REPLACE FUNCTION "public"."calculate_org_storage"("p_organization_id" "uuid") RETURNS TABLE("total_bytes" bigint, "file_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_bytes BIGINT;
    v_file_count INTEGER;
    v_bucket_prefix TEXT;
BEGIN
    -- Files are typically stored with org prefix: org_{uuid}/...
    v_bucket_prefix := 'org_' || p_organization_id::TEXT || '%';
    
    -- Calculate from storage.objects
    SELECT 
        COALESCE(SUM((metadata->>'size')::BIGINT), 0),
        COUNT(*)
    INTO v_total_bytes, v_file_count
    FROM storage.objects
    WHERE name LIKE v_bucket_prefix
    OR bucket_id IN (
        SELECT id FROM storage.buckets 
        WHERE name LIKE v_bucket_prefix
    );
    
    -- Update cache
    INSERT INTO public.storage_usage (organization_id, total_bytes, file_count, last_calculated_at)
    VALUES (p_organization_id, v_total_bytes, v_file_count, NOW())
    ON CONFLICT (organization_id) DO UPDATE
    SET 
        total_bytes = EXCLUDED.total_bytes,
        file_count = EXCLUDED.file_count,
        last_calculated_at = NOW(),
        updated_at = NOW();
    
    RETURN QUERY SELECT v_total_bytes, v_file_count;
END;
$$;


ALTER FUNCTION "public"."calculate_org_storage"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_period_totals"("period_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE staff_payroll_periods
    SET 
        total_hours = (
            SELECT COALESCE(SUM(total_hours), 0)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(final_amount), 0)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        staff_count = (
            SELECT COUNT(DISTINCT staff_id)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        updated_at = NOW()
    WHERE id = period_id;
END;
$$;


ALTER FUNCTION "public"."calculate_period_totals"("period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_invoices_on_service_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Si el servicio pasa de Activo (NULL) a Eliminado (Tiene fecha)
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        UPDATE public.invoices
        SET status = 'cancelled'
        WHERE service_id = NEW.id
        AND status IN ('pending', 'overdue');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cancel_invoices_on_service_soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_member_module_access"("p_org_id" "uuid", "p_user_id" "uuid", "p_module" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
    v_module_value BOOLEAN;
BEGIN
    -- Get member's role and permissions
    SELECT role, permissions INTO v_role, v_permissions
    FROM organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id;
    
    -- Owners have all module access
    IF v_role = 'owner' THEN
        RETURN true;
    END IF;
    
    -- Check explicit module setting
    v_module_value := (v_permissions->'modules'->>p_module)::boolean;
    
    -- If not set, default to true for admins, false for members
    IF v_module_value IS NULL THEN
        RETURN v_role = 'admin';
    END IF;
    
    RETURN v_module_value;
END;
$$;


ALTER FUNCTION "public"."check_member_module_access"("p_org_id" "uuid", "p_user_id" "uuid", "p_module" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_member_permission"("p_org_id" "uuid", "p_user_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
    v_permission_value BOOLEAN;
BEGIN
    -- Get member's role and permissions
    SELECT role, permissions INTO v_role, v_permissions
    FROM organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id;
    
    -- Owners and Admins have all permissions by default
    IF v_role IN ('owner', 'admin') THEN
        -- Check if explicitly disabled
        v_permission_value := v_permissions->'features'->>p_permission;
        IF v_permission_value IS NOT NULL AND v_permission_value = false THEN
            RETURN false;
        END IF;
        RETURN true;
    END IF;
    
    -- For members, check explicit permission
    v_permission_value := v_permissions->'features'->>p_permission;
    RETURN COALESCE(v_permission_value, false);
END;
$$;


ALTER FUNCTION "public"."check_member_permission"("p_org_id" "uuid", "p_user_id" "uuid", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) RETURNS TABLE("allowed" boolean, "current_usage_bytes" bigint, "limit_bytes" bigint, "remaining_bytes" bigint, "usage_percentage" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_usage BIGINT;
    v_limit BIGINT;
    v_remaining BIGINT;
    v_percentage INTEGER;
    v_allowed BOOLEAN;
BEGIN
    -- Get current usage from cache
    SELECT su.total_bytes INTO v_current_usage
    FROM public.storage_usage su
    WHERE su.organization_id = p_organization_id;
    
    -- If no cache, calculate
    IF v_current_usage IS NULL THEN
        SELECT calc.total_bytes INTO v_current_usage
        FROM public.calculate_org_storage(p_organization_id) calc;
    END IF;
    
    -- Get limit
    v_limit := public.get_org_storage_limit(p_organization_id);
    
    -- Unlimited?
    IF v_limit = -1 THEN
        v_allowed := TRUE;
        v_remaining := 9223372036854775807; -- Max BIGINT
        v_percentage := 0;
    ELSE
        v_remaining := GREATEST(0, v_limit - v_current_usage);
        v_allowed := (v_current_usage + p_file_size_bytes) <= v_limit;
        v_percentage := LEAST(100, ((v_current_usage::FLOAT / v_limit::FLOAT) * 100)::INTEGER);
    END IF;
    
    RETURN QUERY SELECT 
        v_allowed,
        v_current_usage,
        v_limit,
        v_remaining,
        v_percentage;
END;
$$;


ALTER FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) IS 'Validates if upload is within limits before allowing';



CREATE OR REPLACE FUNCTION "public"."check_workflow_permission"("p_workflow_id" "uuid", "p_user_id" "uuid", "p_required_role" "public"."workflow_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_role workflow_role;
    v_org_role text;
BEGIN
    -- Check organization role first (Owners/Admins have full access)
    SELECT role INTO v_org_role
    FROM organization_members
    WHERE organization_id = (SELECT organization_id FROM workflows WHERE id = p_workflow_id)
    AND user_id = p_user_id;
    
    IF v_org_role IN ('owner', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Get specific workflow permission
    SELECT role INTO v_user_role
    FROM workflow_permissions
    WHERE workflow_id = p_workflow_id AND user_id = p_user_id;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Role hierarchy check
    -- admin > approver > editor > viewer
    IF p_required_role = 'viewer' THEN
        RETURN TRUE; -- Any role can view
    ELSIF p_required_role = 'editor' THEN
        RETURN v_user_role IN ('editor', 'approver', 'admin');
    ELSIF p_required_role = 'approver' THEN
        RETURN v_user_role IN ('approver', 'admin');
    ELSIF p_required_role = 'admin' THEN
        RETURN v_user_role = 'admin';
    END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_workflow_permission"("p_workflow_id" "uuid", "p_user_id" "uuid", "p_required_role" "public"."workflow_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_passkey_challenges"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.passkey_challenges
    WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_passkey_challenges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_orphan_organizations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_org_id UUID;
    v_member_count INTEGER;
BEGIN
    -- Find all organizations where the deleted user was a member
    FOR v_org_id IN 
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = OLD.id
    LOOP
        -- Count remaining members after this user is deleted
        SELECT COUNT(*) INTO v_member_count
        FROM public.organization_members
        WHERE organization_id = v_org_id
        AND user_id != OLD.id;
        
        -- If no other members remain, delete the organization
        IF v_member_count = 0 THEN
            -- First delete the membership record
            DELETE FROM public.organization_members 
            WHERE organization_id = v_org_id AND user_id = OLD.id;
            
            -- Then delete the orphan organization
            DELETE FROM public.organizations 
            WHERE id = v_org_id;
            
            RAISE NOTICE 'Deleted orphan organization: %', v_org_id;
        ELSE
            -- Just delete the membership, keep the org
            DELETE FROM public.organization_members 
            WHERE organization_id = v_org_id AND user_id = OLD.id;
        END IF;
    END LOOP;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphan_organizations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_orphan_organizations"() IS 'Automatically deletes orphan organizations when their only member is deleted from auth.users.
Only deletes organizations with 0 remaining members to prevent data loss.';



CREATE OR REPLACE FUNCTION "public"."cleanup_portal_access_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM portal_access_logs 
    WHERE created_at < now() - interval '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_portal_access_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_pipeline_stages"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Insert default 7-stage pipeline for the new organization
    INSERT INTO public.pipeline_stages (organization_id, name, status_key, display_order, color, icon, is_active, is_final)
    VALUES
        (NEW.id, 'Nuevo', 'open', 1, 'bg-blue-500', 'plus', true, false),
        (NEW.id, 'Contactado', 'contacted', 2, 'bg-indigo-500', 'mail', true, false),
        (NEW.id, 'Calificado', 'qualified', 3, 'bg-purple-500', 'check-circle', true, false),
        (NEW.id, 'Propuesta Enviada', 'proposal', 4, 'bg-violet-500', 'file-text', true, false),
        (NEW.id, 'Negociación', 'negotiation', 5, 'bg-orange-500', 'users', true, false),
        (NEW.id, 'Ganado', 'won', 6, 'bg-green-500', 'trophy', true, true),
        (NEW.id, 'Perdido', 'lost', 7, 'bg-red-500', 'x-circle', true, true);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_pipeline_stages"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_pipeline_stages"() IS 'Automatically creates default 7-stage pipeline for new organizations';



CREATE OR REPLACE FUNCTION "public"."create_marketing_audience"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_record JSONB;
BEGIN
    INSERT INTO marketing_audiences (
        organization_id, name, description, type, filter_config, cached_count, created_by
    ) VALUES (
        _organization_id, _name, _description, 'dynamic', _filter_config, _cached_count, _created_by
    )
    RETURNING to_jsonb(marketing_audiences.*) INTO new_record;
    
    NOTIFY pgrst, 'reload config';
    
    RETURN new_record;
END;
$$;


ALTER FUNCTION "public"."create_marketing_audience"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_marketing_audience_v2"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_record JSONB;
BEGIN
    INSERT INTO marketing_audiences (
        organization_id, name, description, type, filter_config, cached_count, created_by
    ) VALUES (
        _organization_id, _name, _description, 'dynamic', _filter_config, _cached_count, _created_by
    )
    RETURNING to_jsonb(marketing_audiences.*) INTO new_record;
    
    NOTIFY pgrst, 'reload config';
    
    RETURN new_record;
END;
$$;


ALTER FUNCTION "public"."create_marketing_audience_v2"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.storage_usage
    SET 
        total_bytes = GREATEST(0, total_bytes - p_bytes),
        file_count = GREATEST(0, file_count - 1),
        updated_at = NOW()
    WHERE organization_id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."decrement_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_scheduled_deletions"() RETURNS TABLE("org_id" "uuid", "org_name" "text", "action_taken" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE deletion_scheduled_at < NOW()
        AND deletion_scheduled_at IS NOT NULL
        AND subscription_status IS DISTINCT FROM 'active'
    LOOP
        -- Log before deletion
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_deleted')
        ON CONFLICT DO NOTHING;
        
        -- Delete the organization (cascades to related data)
        DELETE FROM public.organizations WHERE id = r.id;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'deleted';
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."execute_scheduled_deletions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_scheduled_deletions"() IS 'Run weekly via cron to delete scheduled orgs';



CREATE OR REPLACE FUNCTION "public"."find_conversation_by_phone"("p_phone" "text", "p_org_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_clean_input text;
    v_result uuid;
BEGIN
    -- Remove non-digits from input
    v_clean_input := regexp_replace(p_phone, '\D', '', 'g');

    SELECT id INTO v_result
    FROM conversations
    WHERE organization_id = p_org_id
    AND state != 'archived'
    AND (
        -- Exact match of clean numbers
        regexp_replace(phone, '\D', '', 'g') = v_clean_input
        OR
        -- Handle missing 57 prefix in input (Input 300... matches DB 57300...)
        regexp_replace(phone, '\D', '', 'g') = '57' || v_clean_input
        OR
        -- Handle missing 57 prefix in DB (Input 57300... matches DB 300...)
        '57' || regexp_replace(phone, '\D', '', 'g') = v_clean_input
    )
    ORDER BY updated_at DESC
    LIMIT 1;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."find_conversation_by_phone"("p_phone" "text", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_next_agent_atomic"("p_org_id" "uuid", "p_strategy" character varying, "p_agent_pool" "uuid"[] DEFAULT NULL::"uuid"[], "p_channel_type" character varying DEFAULT NULL::character varying, "p_connection_id" character varying DEFAULT NULL::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_agent_id UUID;
    v_last_agent_id UUID;
    v_qualified_agent_ids UUID[];
    v_last_index INT;
    v_methods VARCHAR[];
BEGIN
    -- 0. Acquire advisory lock for this organization to prevent concurrent assignments
    PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text));

    -- 1. Identify "Qualified" Agents
    -- (Online, Heartbeat, and Role/Channel Access)
    SELECT ARRAY_AGG(DISTINCT aa.agent_id ORDER BY aa.agent_id) INTO v_qualified_agent_ids
    FROM public.agent_availability aa
    JOIN public.organization_members om ON om.user_id = aa.agent_id AND om.organization_id = aa.organization_id
    LEFT JOIN public.agent_channels ac ON ac.agent_id = aa.agent_id AND ac.is_active = true
    WHERE aa.organization_id = p_org_id
      AND aa.status = 'online'
      AND aa.auto_assign_enabled = true
      AND aa.last_seen_at > (NOW() - INTERVAL '3 minutes')
      AND (p_agent_pool IS NULL OR aa.agent_id = ANY(p_agent_pool))
      AND (
          LOWER(om.role) IN ('admin', 'owner') 
          OR (p_channel_type IS NOT NULL AND (ac.channel_type = p_channel_type OR ac.channel_type = p_connection_id))
          OR (om.permissions->'inbox_access' @> jsonb_build_array(p_connection_id))
      );

    IF v_qualified_agent_ids IS NULL OR array_length(v_qualified_agent_ids, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- 2. Select Agent based on Strategy
    IF p_strategy IN ('round-robin', 'specific-agent') THEN
        v_methods := CASE WHEN p_strategy = 'round-robin' THEN ARRAY['round-robin', 'auto-rule'] ELSE ARRAY[p_strategy] END;

        -- Get last assigned agent from history
        SELECT h.assigned_to INTO v_last_agent_id
        FROM public.assignment_history h
        JOIN public.conversations c ON c.id = h.conversation_id
        WHERE c.organization_id = p_org_id
          AND h.assignment_method = ANY(v_methods)
        ORDER BY h.created_at DESC
        LIMIT 1;

        v_last_index := array_position(v_qualified_agent_ids, v_last_agent_id);
        IF v_last_index IS NULL THEN
            v_agent_id := v_qualified_agent_ids[1];
        ELSE
            v_agent_id := v_qualified_agent_ids[(v_last_index % array_length(v_qualified_agent_ids, 1)) + 1];
        END IF;

    ELSIF p_strategy = 'load-balance' THEN
        -- Choose agent with lowest load percentage, randomized on ties
        SELECT aa.agent_id INTO v_agent_id
        FROM public.agent_availability aa
        WHERE aa.agent_id = ANY(v_qualified_agent_ids)
          AND aa.current_load < aa.max_capacity
        ORDER BY (aa.current_load::float / NULLIF(aa.max_capacity, 0)) ASC, random()
        LIMIT 1;
    ELSE
        -- Fallback to first qualified
        v_agent_id := v_qualified_agent_ids[1];
    END IF;

    RETURN v_agent_id;
END;
$$;


ALTER FUNCTION "public"."fn_get_next_agent_atomic"("p_org_id" "uuid", "p_strategy" character varying, "p_agent_pool" "uuid"[], "p_channel_type" character varying, "p_connection_id" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recalculate_agent_load"("p_agent_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_actual_load INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_actual_load
    FROM public.conversations
    WHERE assigned_to = p_agent_id
      AND state = 'active'
      AND status IN ('open', 'snoozed');

    UPDATE public.agent_availability
    SET current_load = v_actual_load,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$;


ALTER FUNCTION "public"."fn_recalculate_agent_load"("p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_agent_load_on_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- CASE: Assignment changed (Manual or Auto)
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        IF OLD.assigned_to IS NOT NULL THEN
            PERFORM public.fn_recalculate_agent_load(OLD.assigned_to);
        END IF;
        IF NEW.assigned_to IS NOT NULL THEN
            PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
        END IF;
    
    -- CASE: New conversation with assignment
    ELSIF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
        PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
    
    -- CASE: Status or State changed (Archive, Spam, Delete, Snooze, etc.)
    ELSIF (TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND 
          (OLD.status IS DISTINCT FROM NEW.status OR OLD.state IS DISTINCT FROM NEW.state)) THEN
        PERFORM public.fn_recalculate_agent_load(NEW.assigned_to);
    
    -- CASE: Conversation deleted
    ELSIF (TG_OP = 'DELETE' AND OLD.assigned_to IS NOT NULL) THEN
        PERFORM public.fn_recalculate_agent_load(OLD.assigned_to);
    END IF;

    RETURN NULL; -- AFTER trigger
END;
$$;


ALTER FUNCTION "public"."fn_sync_agent_load_on_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_saas_platform_invoice_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.sequential_number := nextval('saas_platform_invoice_seq');
    NEW.invoice_number := 'PIXY-' || LPAD(NEW.sequential_number::text, 6, '0');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_saas_platform_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_short_token"("length" integer DEFAULT 6) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || chars[1+floor(random()*array_length(chars, 1))];
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_short_token"("length" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_payment_gateway"() RETURNS TABLE("gateway_name" "text", "display_name" "text", "public_key" "text", "config" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgc.gateway_name,
        pgc.display_name,
        pgc.public_key,
        pgc.config
    FROM public.payment_gateway_config pgc
    WHERE pgc.is_enabled = TRUE
    AND pgc.is_live_mode = (
        -- Check if we're in production
        CASE WHEN current_setting('app.environment', true) = 'production' 
        THEN TRUE ELSE FALSE END
    )
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_active_payment_gateway"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_advanced_crm_reports"("p_org_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_leads INT;
    v_new_leads INT;
    v_won_leads INT;
    v_abandoned_leads INT;
    v_avg_response INT;
    v_pipeline_value DECIMAL(12,2);
    v_agent_performance JSONB;
    v_lead_sources JSONB;
    v_history JSONB;
    v_abandoned_list JSONB;
BEGIN
    -- 1. General Metrics (FILTERED BY PERIOD)
    
    -- "Total Leads" is now "New Leads" in period for accuracy
    SELECT COUNT(*), COALESCE(SUM(value), 0)
    INTO v_new_leads, v_pipeline_value
    FROM public.leads
    WHERE organization_id = p_org_id
      AND created_at BETWEEN p_start_date AND p_end_date;

    -- Cumulative Total Leads (for conversion baseline)
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE organization_id = p_org_id;

    -- Won leads (within period)
    SELECT COUNT(*)
    INTO v_won_leads
    FROM public.leads
    WHERE organization_id = p_org_id
      AND status = 'won'
      AND updated_at BETWEEN p_start_date AND p_end_date;

    -- Abandoned leads (no human message in 24h, still open as of "Now")
    -- We keep this as current situation for Command Center
    SELECT COUNT(DISTINCT c.id)
    INTO v_abandoned_leads
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.status = 'open'
      AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'));

    -- Get detailed list of abandoned leads
    SELECT jsonb_agg(abandoned_data)
    INTO v_abandoned_list
    FROM (
        SELECT 
            l.id,
            l.name,
            c.waiting_since,
            EXTRACT(EPOCH FROM (now() - c.waiting_since))::INT as waiting_seconds,
            COALESCE(p.full_name, 'Sin asignar') as assigned_agent,
            c.assigned_to as agent_id
        FROM public.conversations c
        JOIN public.leads l ON c.lead_id = l.id
        LEFT JOIN public.profiles p ON c.assigned_to = p.id
        WHERE c.organization_id = p_org_id
          AND c.status = 'open'
          AND (c.waiting_since < (now() - interval '24 hours') OR (c.last_message_at < (now() - interval '24 hours') AND c.metadata->>'last_message_direction' = 'inbound'))
        ORDER BY c.waiting_since ASC
        LIMIT 15
    ) abandoned_data;

    -- 2. Average Response Times (Filtered by period)
    SELECT 
        AVG(average_response_time_seconds)::INT
    INTO v_avg_response
    FROM public.conversations
    WHERE organization_id = p_org_id
      AND average_response_time_seconds > 0
      AND updated_at BETWEEN p_start_date AND p_end_date;

    -- 3. Lead Sources Distribution (Filtered by period)
    SELECT jsonb_agg(source_data)
    INTO v_lead_sources
    FROM (
        SELECT source, COUNT(*) as count
        FROM public.leads
        WHERE organization_id = p_org_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY source
        ORDER BY count DESC
    ) source_data;

    -- 4. Agent Performance (Robust Join with availability and status)
    SELECT jsonb_agg(perf)
    INTO v_agent_performance
    FROM (
        WITH 
        t_stats AS (
            SELECT 
                assigned_to, 
                COUNT(*) as leads_count,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
                AVG(CASE WHEN average_response_time_seconds > 0 THEN average_response_time_seconds ELSE NULL END)::INT as avg_resp,
                -- SLA Insight: Responses < 5 minutes (300s)
                SUM(CASE WHEN average_response_time_seconds > 0 AND average_response_time_seconds <= 300 THEN 1 ELSE 0 END) as fast_responses_count,
                COUNT(CASE WHEN average_response_time_seconds > 0 THEN 1 ELSE NULL END) as total_responded
            FROM public.conversations
            WHERE organization_id = p_org_id
              AND updated_at BETWEEN p_start_date AND p_end_date
            GROUP BY assigned_to
        ),
        t_connection AS (
            SELECT 
                agent_id, 
                SUM(
                    CASE 
                        WHEN ended_at IS NOT NULL THEN duration_seconds 
                        ELSE EXTRACT(EPOCH FROM (now() - started_at))::INT 
                    END
                )::INT as connected_seconds
            FROM public.agent_status_history
            WHERE organization_id = p_org_id
              AND status != 'offline'
              AND started_at BETWEEN p_start_date AND p_end_date
            GROUP BY agent_id
        )
        SELECT 
            m.user_id as agent_id,
            COALESCE(NULLIF(p.full_name, ''), 'Agente') as agent_name,
            p.avatar_url as avatar_url,
            COALESCE(ts.leads_count, 0) as leads_assigned,
            COALESCE(ts.won_count, 0) as deals_won,
            COALESCE(ts.avg_resp, 0) as avg_response_time,
            COALESCE(tc.connected_seconds, 0) as connection_time_seconds,
            COALESCE(aa.status, 'offline') as agent_status,
            -- Calculate SLA Ratio: (%) of conversations meeting < 5s
            CASE 
                WHEN COALESCE(ts.total_responded, 0) > 0 
                THEN ROUND((ts.fast_responses_count::numeric / ts.total_responded::numeric) * 100) 
                ELSE 0 
            END as sla_met_percentage
        FROM public.organization_members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN t_stats ts ON m.user_id = ts.assigned_to
        LEFT JOIN t_connection tc ON m.user_id = tc.agent_id
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
        ORDER BY leads_assigned DESC
    ) perf;

    -- 5. Daily Activity History
    SELECT jsonb_agg(hist)
    INTO v_history
    FROM (
        SELECT 
            d::date as date,
            (SELECT COUNT(*) FROM public.leads WHERE organization_id = p_org_id AND created_at::date = d::date) as new_leads,
            -- REAL: Count outbound messages from messages table
            (SELECT COUNT(*) FROM public.messages m 
             JOIN public.conversations c ON m.conversation_id = c.id 
             WHERE c.organization_id = p_org_id 
               AND m.direction = 'outbound' 
               AND m.created_at::date = d::date) as messages_sent
        FROM generate_series(p_start_date::date, p_end_date::date, '1 day'::interval) d
    ) hist;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'debug_org_id', p_org_id,
        'summary', jsonb_build_object(
            'total_leads', v_new_leads, -- Show new leads as primary metric
            'won_leads', v_won_leads,
            'abandoned_leads', v_abandoned_leads,
            'avg_response_time', COALESCE(v_avg_response, 0),
            'pipeline_value', v_pipeline_value,
            'conversion_rate', CASE WHEN v_new_leads > 0 THEN ROUND((v_won_leads::numeric / v_new_leads::numeric) * 100) ELSE 0 END
        ),
        'agent_performance', COALESCE(v_agent_performance, '[]'::jsonb),
        'lead_sources', COALESCE(v_lead_sources, '[]'::jsonb),
        'activity_trend', COALESCE(v_history, '[]'::jsonb),
        'abandoned_leads_list', COALESCE(v_abandoned_list, '[]'::jsonb)
    );
END;
$$;


ALTER FUNCTION "public"."get_advanced_crm_reports"("p_org_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agency_dashboard_metrics"("p_org_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  total_revenue numeric;
  pending_payments numeric;
  total_overdue numeric;
  active_clients_count integer;
  debtors_list json;
begin
  -- 1. Calcular Totales (Ignoramos deleted_at to match logic strictly, but usually should exclude)
  -- Adding deleted_at is null check for consistency
  select coalesce(sum(total), 0) into total_revenue
  from invoices
  where organization_id = p_org_id and status = 'paid' and deleted_at is null;
  
  -- Pending: (Pending OR Draft) AND (Future OR Null Date)
  select coalesce(sum(total), 0) into pending_payments
  from invoices
  where organization_id = p_org_id 
  and status in ('pending', 'draft')
  and (due_date is null or due_date >= current_date)
  and deleted_at is null;
  
  -- Overdue: Status overdue OR ((Pending OR Draft) AND Past Date)
  select coalesce(sum(total), 0) into total_overdue
  from invoices
  where organization_id = p_org_id 
  and deleted_at is null
  and (
    status = 'overdue' 
    or (status in ('pending', 'draft') and due_date < current_date)
  );
  
  -- 2. Clientes Activos
  select count(*) into active_clients_count
  from clients
  where organization_id = p_org_id and deleted_at is null;
  
  -- 3. Lista de Deudores (Top 5)
  with debtor_stats as (
    select client_id, sum(total) as debt
    from invoices
    where organization_id = p_org_id 
    and deleted_at is null
    and (
      status = 'overdue' 
      or (status in ('pending', 'draft') and due_date < current_date)
    )
    group by client_id
  )
  select json_agg(t) into debtors_list
  from (
    select 
      c.id, 
      c.id, 
      c.name, 
      c.company_name, 
      c.company_name, 
      c.logo_url as image,
      ds.debt
    from debtor_stats ds
    join clients c on c.id = ds.client_id
    order by ds.debt desc
    limit 5
  ) t;
  
  return json_build_object(
    'revenue', total_revenue,
    'pending', pending_payments,
    'overdue', total_overdue,
    'clients_count', active_clients_count,
    'debtors', coalesce(debtors_list, '[]'::json)
  );
end;
$$;


ALTER FUNCTION "public"."get_agency_dashboard_metrics"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agent_monitoring_stats"("p_org_id" "uuid") RETURNS TABLE("user_id" "uuid", "name" "text", "avatar_url" "text", "online" boolean, "unread_count" integer, "last_interaction_at" timestamp with time zone, "current_load" integer, "max_capacity" integer, "offline_hours_24h" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_unassigned_count INT := 0;
    v_unassigned_last TIMESTAMPTZ;
BEGIN
    -- 1. Contamos chats sin asignar (Único punto de verdad para chats pendientes)
    SELECT 
        COUNT(DISTINCT c.id)::INT,
        MAX(c.last_message_at)
    INTO v_unassigned_count, v_unassigned_last
    FROM public.conversations c
    WHERE c.organization_id = p_org_id
      AND c.assigned_to IS NULL
      AND c.status = 'open'
      AND (COALESCE(c.state, 'active') = 'active')
      AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound');

    -- 2. Retornamos la fila "Sin Asignar" primero si tiene chats
    IF v_unassigned_count > 0 THEN
        user_id := '00000000-0000-0000-0000-000000000000'::UUID;
        name := 'Sin asignar';
        avatar_url := NULL;
        online := true; -- Siempre visible si hay chats
        unread_count := v_unassigned_count;
        last_interaction_at := v_unassigned_last;
        current_load := v_unassigned_count;
        max_capacity := 0;
        offline_hours_24h := 0.0;
        RETURN NEXT;
    END IF;

    -- 3. Retornamos agentes reales
    RETURN QUERY
    WITH 
    t_agents AS (
        SELECT 
            m.user_id as uid,
            COALESCE(NULLIF(p.full_name, ''), 'Agente ' || LEFT(m.user_id::text, 4)) as uname,
            p.avatar_url as uavatar,
            -- GHOST DETECTION: Si no se ha visto en 10 min, está offline aunque diga online
            CASE 
                WHEN aa.status = 'online' AND (aa.last_seen_at > NOW() - INTERVAL '10 minutes') THEN true 
                ELSE false 
            END as uonline,
            COALESCE(aa.current_load, 0) as uload,
            COALESCE(aa.max_capacity, 10) as ucapacity,
            m.role as urole,
            aa.last_seen_at as ulast_seen
        FROM public.organization_members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.agent_availability aa ON m.user_id = aa.agent_id AND m.organization_id = aa.organization_id
        WHERE m.organization_id = p_org_id
    ),
    t_assigned_unreads AS (
        SELECT 
            c.assigned_to as u_assigned,
            COUNT(DISTINCT c.id)::INT as u_count,
            MAX(c.last_message_at) as u_last
        FROM public.conversations c
        WHERE c.organization_id = p_org_id
          AND c.assigned_to IS NOT NULL
          AND c.status = 'open'
          AND (COALESCE(c.state, 'active') = 'active')
          AND (COALESCE(c.metadata->>'last_message_direction', '') = 'inbound')
        GROUP BY c.assigned_to
    )
    SELECT 
        ta.uid, 
        ta.uname, 
        ta.uavatar, 
        ta.uonline, 
        -- Solo sus propios chats asignados (QUITAMOS la suma de sin asignar para evitar desbordar al Admin)
        COALESCE(tau.u_count, 0)::INT, 
        tau.u_last,
        ta.uload, 
        ta.ucapacity, 
        (CASE WHEN ta.uonline THEN 0.0 ELSE 24.0 END)::FLOAT
    FROM t_agents ta
    LEFT JOIN t_assigned_unreads tau ON ta.uid = tau.u_assigned
    ORDER BY ta.uonline DESC, 5 DESC, ta.uname ASC;
END;
$$;


ALTER FUNCTION "public"."get_agent_monitoring_stats"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_org_ids"() RETURNS TABLE("organization_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY 
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_auth_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_briefing_by_token"("p_token" "text") RETURNS TABLE("id" "uuid", "status" "text", "template_id" "uuid", "client_id" "uuid", "client_name" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  normalized_token text;
BEGIN
  -- Normalize token (trim whitespace)
  normalized_token := trim(p_token);

  RETURN QUERY
  SELECT 
    b.id,
    b.status::text,
    b.template_id,
    c.id as client_id,
    c.name as client_name,
    b.created_at,
    b.updated_at
  FROM briefings b
  JOIN clients c ON b.client_id = c.id
  WHERE 
    -- Case 1: Match UUID portal_token (cast to text)
    (c.portal_token::text = normalized_token)
    OR 
    -- Case 2: Match short token (exact match)
    (c.portal_short_token = normalized_token)
    OR
    -- Case 3: Match briefing specific token (64-char hash)
    (b.token = normalized_token);
END;
$$;


ALTER FUNCTION "public"."get_briefing_by_token"("p_token" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."briefing_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "briefing_id" "uuid",
    "field_id" "text",
    "value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."briefing_responses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_briefing_responses"("p_briefing_id" "uuid") RETURNS SETOF "public"."briefing_responses"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY SELECT * FROM briefing_responses WHERE briefing_id = p_briefing_id;
END;
$$;


ALTER FUNCTION "public"."get_briefing_responses"("p_briefing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_by_short_token"("token_input" "text") RETURNS TABLE("id" "uuid", "name" "text", "company_name" "text", "email" "text", "portal_short_token" "text", "portal_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.company_name, c.email, c.portal_short_token, c.portal_token
    FROM clients c
    WHERE c.portal_short_token = token_input;
END;
$$;


ALTER FUNCTION "public"."get_client_by_short_token"("token_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_by_token"("token_input" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "company_name" "text", "email" "text", "portal_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.company_name, c.email, c.portal_token
    FROM clients c
    WHERE c.portal_token = token_input;
END;
$$;


ALTER FUNCTION "public"."get_client_by_token"("token_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_content_text"("content" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Handle strings
    IF jsonb_typeof(content) = 'string' THEN
        RETURN content#>>'{}';
    END IF;
    
    -- Handle objects
    IF jsonb_typeof(content) = 'object' THEN
        RETURN COALESCE(
            content->>'body', 
            content->>'text', 
            content->>'content',
            content::text 
        );
    END IF;
    
    RETURN content::text;
END;
$$;


ALTER FUNCTION "public"."get_content_text"("content" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expiring_trials"() RETURNS TABLE("org_id" "uuid", "org_name" "text", "owner_email" "text", "days_remaining" integer, "notification_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 7 days warning
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        u.email,
        EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER,
        'trial_ending_7d'::TEXT
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id AND om.role = 'owner'
    JOIN auth.users u ON u.id = om.user_id
    LEFT JOIN public.lifecycle_notifications ln ON ln.organization_id = o.id AND ln.notification_type = 'trial_ending_7d'
    WHERE o.trial_ends_at BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
    AND o.subscription_status IS DISTINCT FROM 'active'
    AND ln.id IS NULL;
    
    -- 1 day warning
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        u.email,
        EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER,
        'trial_ending_1d'::TEXT
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id AND om.role = 'owner'
    JOIN auth.users u ON u.id = om.user_id
    LEFT JOIN public.lifecycle_notifications ln ON ln.organization_id = o.id AND ln.notification_type = 'trial_ending_1d'
    WHERE o.trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '2 days'
    AND o.subscription_status IS DISTINCT FROM 'active'
    AND ln.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_expiring_trials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_sequence_value"("org_id" "uuid", "entity_key" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_val INTEGER;
BEGIN
    -- Upsert the sequence record and increment atomically
    INSERT INTO public.organization_sequences (organization_id, entity_type, last_number)
    VALUES (org_id, entity_key, 1)
    ON CONFLICT (organization_id, entity_type)
    DO UPDATE SET 
        last_number = public.organization_sequences.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO next_val;
    
    RETURN next_val;
END;
$$;


ALTER FUNCTION "public"."get_next_sequence_value"("org_id" "uuid", "entity_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_modules_with_fallback"("org_id" "uuid") RETURNS TABLE("module_key" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Try to get modules from organization's subscription_product_id
    RETURN QUERY
    SELECT DISTINCT sm.key::TEXT as module_key
    FROM organizations o
    JOIN saas_products sp ON o.subscription_product_id = sp.id
    JOIN saas_product_modules spm ON sp.id = spm.product_id
    JOIN system_modules sm ON spm.module_id = sm.id
    WHERE o.id = org_id;
    
    -- If no modules found (no subscription), return core modules
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT DISTINCT sm.key::TEXT as module_key
        FROM system_modules sm
        WHERE sm.key IN ('core_clients', 'core_settings');
    END IF;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."get_org_modules_with_fallback"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_storage_limit"("p_organization_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_limit_gb INTEGER;
BEGIN
    SELECT limit_value INTO v_limit_gb
    FROM public.usage_limits
    WHERE organization_id = p_organization_id
    AND engine = 'storage_gb';
    
    -- Default to 5GB if no limit set
    IF v_limit_gb IS NULL THEN
        v_limit_gb := 5;
    END IF;
    
    -- -1 means unlimited
    IF v_limit_gb = -1 THEN
        RETURN -1;
    END IF;
    
    -- Convert GB to bytes
    RETURN v_limit_gb::BIGINT * 1024 * 1024 * 1024;
END;
$$;


ALTER FUNCTION "public"."get_org_storage_limit"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_orphans TEXT[] := ARRAY[]::TEXT[];
    v_module RECORD;
    v_dep JSONB;
BEGIN
    -- Loop through currently active modules
    FOR v_module IN 
        SELECT * FROM public.system_modules 
        WHERE key = ANY(p_current_active_modules)
        AND key != p_module_to_disable
    LOOP
        -- Check if this module depends on the one being disabled
        IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
            FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
            LOOP
                IF (v_dep->>'module_key') = p_module_to_disable AND
                   (v_dep->>'type') = 'required' THEN
                    v_orphans := array_append(v_orphans, v_module.key);
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN v_orphans;
END;
$$;


ALTER FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) IS 'Returns modules that will be orphaned if specified module is disabled';



CREATE OR REPLACE FUNCTION "public"."get_paginated_clients"("p_org_id" "uuid", "p_search" "text" DEFAULT ''::"text", "p_status" "text" DEFAULT 'all'::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 50) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_offset INT;
    v_result JSON;
BEGIN
    v_offset := (p_page - 1) * p_page_size;

    WITH client_metrics AS (
        SELECT 
            c.id AS client_id,
            c.name,
            c.company_name,
            c.logo_url,
            c.created_at,
            c.portal_token,
            c.portal_short_token,
            c.phone,
            c.email,
            (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id AND s.status = 'active' AND s.deleted_at IS NULL) +
            (SELECT COUNT(*) FROM subscriptions sub WHERE sub.client_id = c.id AND sub.status = 'active' AND sub.deleted_at IS NULL) AS active_services_count,
            (SELECT COALESCE(SUM(
                CASE WHEN i.status IN ('pending', 'overdue') AND i.due_date < CURRENT_DATE THEN i.total ELSE 0 END
            ), 0) FROM invoices i WHERE i.client_id = c.id AND i.deleted_at IS NULL) AS debt,
            (SELECT COALESCE(SUM(
                CASE WHEN i.status IN ('pending', 'overdue') AND (i.due_date IS NULL OR i.due_date >= CURRENT_DATE) THEN i.total ELSE 0 END
            ), 0) FROM invoices i WHERE i.client_id = c.id AND i.deleted_at IS NULL) AS future_debt
        FROM leads c
        WHERE c.organization_id = p_org_id 
          AND c.deleted_at IS NULL 
          AND c.contact_type = 'client'
    ),
    client_status AS (
        SELECT 
            *,
            CASE 
                WHEN debt > 0 THEN 'overdue'
                WHEN future_debt > 0 THEN 'urgent'
                WHEN active_services_count = 0 THEN 'inactive'
                ELSE 'active'
            END AS computed_status
        FROM client_metrics
    ),
    filtered_clients AS (
        SELECT * FROM client_status
        WHERE 
            (p_search = '' OR name ILIKE '%' || p_search || '%' OR COALESCE(company_name, '') ILIKE '%' || p_search || '%')
            AND
            (p_status = 'all' OR computed_status = p_status)
    ),
    paged_clients AS (
        SELECT * FROM filtered_clients
        ORDER BY created_at DESC
        LIMIT p_page_size OFFSET v_offset
    ),
    enriched_clients AS (
        SELECT 
            pc.*,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', i.id, 'total', i.total, 'status', i.status, 'due_date', i.due_date, 
                    'number', i.number, 'pdf_url', i.pdf_url, 'deleted_at', i.deleted_at,
                    'billing_cycles', (SELECT json_build_object('start_date', bc.start_date, 'end_date', bc.end_date) FROM billing_cycles bc WHERE bc.id = i.billing_cycle_id)
                )) FROM invoices i WHERE i.client_id = pc.client_id AND i.deleted_at IS NULL
            ), '[]'::json) AS invoices,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', q.id, 'number', q.number, 'total', q.total, 'status', q.status, 'pdf_url', q.pdf_url, 'deleted_at', q.deleted_at
                )) FROM quotes q WHERE q.client_id = pc.client_id AND q.deleted_at IS NULL
            ), '[]'::json) AS quotes,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'status', h.status, 'renewal_date', h.renewal_date
                )) FROM hosting_accounts h WHERE h.client_id = pc.client_id
            ), '[]'::json) AS hosting_accounts,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', s.id, 'name', s.name, 'next_billing_date', s.next_billing_date, 'status', s.status, 'amount', s.amount, 'service_type', s.service_type, 'frequency', s.frequency, 'deleted_at', s.deleted_at
                )) FROM subscriptions s WHERE s.client_id = pc.client_id AND s.deleted_at IS NULL
            ), '[]'::json) AS subscriptions,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', serv.id, 'status', serv.status, 'deleted_at', serv.deleted_at
                )) FROM services serv WHERE serv.client_id = pc.client_id AND serv.deleted_at IS NULL
            ), '[]'::json) AS services
        FROM paged_clients pc
    ),
    aggregated_data AS (
        SELECT 
            (SELECT COUNT(*) FROM client_status) AS count_all,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'overdue') AS count_overdue,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'urgent') AS count_urgent,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'active') AS count_active,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'inactive') AS count_inactive,
            (SELECT COUNT(*) FROM filtered_clients) AS total_count,
            COALESCE((
                SELECT json_agg(row_to_json(ec))
                FROM enriched_clients ec
            ), '[]'::json) AS clients_data
    )
    SELECT json_build_object(
        'clients', clients_data,
        'totalCount', total_count,
        'counts', json_build_object(
            'all', count_all,
            'overdue', count_overdue,
            'urgent', count_urgent,
            'active', count_active,
            'inactive', count_inactive
        )
    ) INTO v_result
    FROM aggregated_data;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_paginated_clients"("p_org_id" "uuid", "p_search" "text", "p_status" "text", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text" DEFAULT ''::"text", "p_stage_id" "text" DEFAULT 'all'::"text", "p_connection_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 50, "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset INT; v_total_count INT; v_leads JSONB; v_stage_counts JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  -- Conteo
  SELECT count(*) INTO v_total_count FROM public.leads
  WHERE organization_id = p_org_id
    AND (p_search = '' OR (name ILIKE '%' || p_search || '%' OR email ILIKE '%' || p_search || '%'))
    AND (p_stage_id = 'all' OR status = p_stage_id)
    AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
    AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id);
  -- Leads
  SELECT jsonb_agg(l) INTO v_leads FROM (
      SELECT * FROM public.leads WHERE organization_id = p_org_id
        AND (p_search = '' OR (name ILIKE '%' || p_search || '%' OR email ILIKE '%' || p_search || '%'))
        AND (p_stage_id = 'all' OR status = p_stage_id)
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
      ORDER BY created_at DESC LIMIT p_page_size OFFSET v_offset
  ) l;
  -- Conteos Kanban
  SELECT jsonb_object_agg(status, count) INTO v_stage_counts FROM (
      SELECT status, count(*) as count FROM public.leads WHERE organization_id = p_org_id
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
      GROUP BY status
  ) s;
  RETURN jsonb_build_object('leads', COALESCE(v_leads, '[]'::jsonb), 'totalCount', v_total_count, 'stageCounts', COALESCE(v_stage_counts, '{}'::jsonb));
END; $$;


ALTER FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text" DEFAULT ''::"text", "p_stage_id" "text" DEFAULT 'all'::"text", "p_connection_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 50, "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_contact_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset INT;
  v_total_count INT;
  v_leads JSONB;
  v_stage_counts JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- 1. Total Count
  SELECT count(*)
  INTO v_total_count
  FROM public.leads
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    AND (
        p_contact_type IS NULL 
        OR contact_type = p_contact_type 
        OR (p_contact_type = 'lead' AND (contact_type = 'prospect' OR contact_type IS NULL))
    )
    AND (p_search = '' OR (
        name ILIKE '%' || p_search || '%' OR
        company_name ILIKE '%' || p_search || '%' OR
        email ILIKE '%' || p_search || '%' OR
        phone ILIKE '%' || p_search || '%'
    ))
    AND (p_stage_id = 'all' OR status = p_stage_id)
    AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
    AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- 2. Fetch Leads
  SELECT jsonb_agg(res)
  INTO v_leads
  FROM (
      SELECT *
      FROM public.leads
      WHERE organization_id = p_org_id
        AND deleted_at IS NULL
        AND (
            p_contact_type IS NULL 
            OR contact_type = p_contact_type 
            OR (p_contact_type = 'lead' AND (contact_type = 'prospect' OR contact_type IS NULL))
        )
        AND (p_search = '' OR (
            name ILIKE '%' || p_search || '%' OR
            company_name ILIKE '%' || p_search || '%' OR
            email ILIKE '%' || p_search || '%' OR
            phone ILIKE '%' || p_search || '%'
        ))
        AND (p_stage_id = 'all' OR status = p_stage_id)
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
        AND (p_date_from IS NULL OR created_at >= p_date_from)
        AND (p_date_to IS NULL OR created_at <= p_date_to)
      ORDER BY created_at DESC
      LIMIT p_page_size
      OFFSET v_offset
  ) res;

  -- 3. Stage counts
  SELECT jsonb_object_agg(status, count)
  INTO v_stage_counts
  FROM (
      SELECT status, count(*) as count
      FROM public.leads
      WHERE organization_id = p_org_id
        AND deleted_at IS NULL
        AND (
            p_contact_type IS NULL 
            OR contact_type = p_contact_type 
            OR (p_contact_type = 'lead' AND (contact_type = 'prospect' OR contact_type IS NULL))
        )
        AND (p_connection_ids IS NULL OR source_connection_id = ANY(p_connection_ids) OR source_connection_id IS NULL)
        AND (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id)
      GROUP BY status
  ) s;

  RETURN jsonb_build_object(
    'leads', COALESCE(v_leads, '[]'::jsonb),
    'totalCount', v_total_count,
    'stageCounts', COALESCE(v_stage_counts, '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_contact_type" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_workflow_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "execution_id" "uuid",
    "status" "public"."scheduled_job_status" DEFAULT 'pending'::"public"."scheduled_job_status" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "resume_from_node_id" "text" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scheduled_workflow_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."scheduled_workflow_jobs" IS 'Stores delayed workflow executions waiting to resume';



CREATE OR REPLACE FUNCTION "public"."get_pending_scheduled_jobs"("batch_size" integer DEFAULT 10) RETURNS SETOF "public"."scheduled_workflow_jobs"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    UPDATE scheduled_workflow_jobs
    SET status = 'processing', started_at = now(), attempts = attempts + 1
    WHERE id IN (
        SELECT id FROM scheduled_workflow_jobs
        WHERE status = 'pending'
        AND scheduled_for <= now()
        AND attempts < max_attempts
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;


ALTER FUNCTION "public"."get_pending_scheduled_jobs"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") RETURNS TABLE("template_id" "text", "template_name" "text", "template_slug" "text", "template_category" "text", "price_monthly" numeric, "module_count" integer, "match_score" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.slug,
        a.category,
        a.price_monthly,
        (SELECT COUNT(*) FROM public.saas_app_modules WHERE app_id = a.id)::INTEGER as module_count,
        CASE 
            WHEN a.recommended_for_verticals @> ARRAY[p_vertical] THEN 100
            WHEN a.recommended_for_verticals @> ARRAY['*'] THEN 50
            ELSE 0
        END as match_score
    FROM public.saas_apps a
    WHERE a.is_active = true
    AND (
        a.recommended_for_verticals @> ARRAY[p_vertical]
        OR a.recommended_for_verticals @> ARRAY['*']
    )
    ORDER BY match_score DESC, a.price_monthly ASC;
END;
$$;


ALTER FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") IS 'Returns solution templates recommended for a specific business vertical, with match scoring';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND read = FALSE
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_message_unsnooze"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only for inbound messages or if we want outbound to also reopen it (usually yes)
    -- Let's say ANY new message reopens the conversation
    UPDATE public.conversations
    SET 
        status = 'open',
        snoozed_until = NULL,
        updated_at = NOW()
    WHERE id = NEW.conversation_id
    AND status = 'snoozed';
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_message_unsnooze"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_org_member_agent"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.agent_availability (
        organization_id,
        agent_id,
        status,
        max_capacity,
        current_load,
        auto_assign_enabled,
        last_seen_at
    )
    VALUES (
        NEW.organization_id,
        NEW.user_id,
        'offline',
        50,
        0,
        true,  -- Enable auto-assign by default so new agents can receive leads
        now()
    )
    ON CONFLICT (organization_id, agent_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_org_member_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, platform_role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.storage_usage (organization_id, total_bytes, file_count)
    VALUES (p_organization_id, p_bytes, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET 
        total_bytes = storage_usage.total_bytes + p_bytes,
        file_count = storage_usage.file_count + 1,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."increment_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_usage"("p_organization_id" "uuid", "p_engine" "text", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_today date := current_date;
    v_month_start date := date_trunc('month', current_date)::date;
BEGIN
    -- Day Counter
    INSERT INTO public.usage_counters (organization_id, engine, period_start, period, used)
    VALUES (p_organization_id, p_engine, v_today, 'day', p_quantity)
    ON CONFLICT (organization_id, engine, period_start, period)
    DO UPDATE SET used = usage_counters.used + EXCLUDED.used, updated_at = now();

    -- Month Counter
    INSERT INTO public.usage_counters (organization_id, engine, period_start, period, used)
    VALUES (p_organization_id, p_engine, v_month_start, 'month', p_quantity)
    ON CONFLICT (organization_id, engine, period_start, period)
    DO UPDATE SET used = usage_counters.used + EXCLUDED.used, updated_at = now();
END;
$$;


ALTER FUNCTION "public"."increment_usage"("p_organization_id" "uuid", "p_engine" "text", "p_quantity" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "company_name" "text",
    "nit" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "logo_url" "text",
    "notes" "text" DEFAULT ''::"text",
    "facebook" "text" DEFAULT ''::"text",
    "instagram" "text" DEFAULT ''::"text",
    "tiktok" "text" DEFAULT ''::"text",
    "website" "text" DEFAULT ''::"text",
    "portal_token" "uuid" DEFAULT "gen_random_uuid"(),
    "portal_short_token" "text",
    "portal_token_created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "organization_id" "uuid" NOT NULL,
    "portal_insights_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "portal_config" "jsonb" DEFAULT '{}'::"jsonb",
    "portal_token_expires_at" timestamp with time zone,
    "portal_token_never_expires" boolean DEFAULT true,
    "linkedin" "text",
    "twitter" "text",
    "youtube" "text",
    "avatar_url" "text",
    "category_id" "uuid"
);

ALTER TABLE ONLY "public"."clients" REPLICA IDENTITY FULL;


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."user_id" IS 'Optional link to a specific admin user. organization_id is the primary ownership field.';



COMMENT ON COLUMN "public"."clients"."tiktok" IS 'TikTok username or profile URL';



COMMENT ON COLUMN "public"."clients"."portal_config" IS 'Client-specific portal configuration and module visibility settings';



COMMENT ON COLUMN "public"."clients"."linkedin" IS 'LinkedIn profile URL';



COMMENT ON COLUMN "public"."clients"."twitter" IS 'Twitter/X username or profile URL';



COMMENT ON COLUMN "public"."clients"."youtube" IS 'YouTube channel URL';



CREATE OR REPLACE FUNCTION "public"."is_portal_token_valid"("client_row" "public"."clients") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- If never_expires is true, always valid
    IF client_row.portal_token_never_expires = true THEN
        RETURN true;
    END IF;
    
    -- If expires_at is null but never_expires is false, invalid config (treat as expired)
    IF client_row.portal_token_expires_at IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check expiration
    RETURN client_row.portal_token_expires_at > now();
END;
$$;


ALTER FUNCTION "public"."is_portal_token_valid"("client_row" "public"."clients") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_agent_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only act if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Close previous open session for this agent/org
        UPDATE public.agent_status_history
        SET 
            ended_at = now(),
            duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER
        WHERE agent_id = NEW.agent_id 
          AND organization_id = NEW.organization_id 
          AND ended_at IS NULL;
          
        -- Create new session entry
        INSERT INTO public.agent_status_history (organization_id, agent_id, status, started_at)
        VALUES (NEW.organization_id, NEW.agent_id, NEW.status, now());
        
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_agent_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_payment_config_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.payment_config_audit (
        gateway_name, action, changed_by, changes
    ) VALUES (
        COALESCE(NEW.gateway_name, OLD.gateway_name),
        TG_OP,
        auth.uid(),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_payment_config_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid") RETURNS TABLE("id" "uuid", "question" "text", "answer" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    kb.id,
    kb.question,
    kb.answer,
    1 - (kb.embedding <=> query_embedding) as similarity
  from knowledge_base kb
  where 1 - (kb.embedding <=> query_embedding) > match_threshold
  and kb.organization_id = msg_org_id
  order by kb.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_knowledge"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_v2"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid", "category_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "question" "text", "answer" "text", "category" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.question,
    kb.answer,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE (1 - (kb.embedding <=> query_embedding) > match_threshold)
    AND kb.organization_id = msg_org_id
    AND (
      category_filter IS NULL 
      OR kb.category = category_filter 
      OR kb.category = 'General'
      OR kb.category = 'general'
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_knowledge_v2"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid", "category_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_v2"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid", "category_filter" "text" DEFAULT NULL::"text", "audience_filter" "public"."knowledge_audience" DEFAULT NULL::"public"."knowledge_audience") RETURNS TABLE("id" "uuid", "question" "text", "answer" "text", "category" "text", "audience" "public"."knowledge_audience", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.question,
    kb.answer,
    kb.category,
    kb.audience,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE (1 - (kb.embedding <=> query_embedding) > match_threshold)
    AND kb.organization_id = msg_org_id
    AND (
      category_filter IS NULL 
      OR kb.category = category_filter 
      OR kb.category ILIKE 'general'
    )
    AND (
      audience_filter IS NULL
      OR (audience_filter = 'staff') -- Staff sees everything
      OR (audience_filter = 'customer' AND kb.audience IN ('customer', 'both')) -- Customers only see public
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_knowledge_v2"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "msg_org_id" "uuid", "category_filter" "text", "audience_filter" "public"."knowledge_audience") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_trial_expirations"() RETURNS TABLE("org_id" "uuid", "org_name" "text", "action_taken" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r RECORD;
BEGIN
    -- Suspend expired trials
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE trial_ends_at < NOW()
        AND subscription_status IS DISTINCT FROM 'active'
        AND status = 'active'
    LOOP
        UPDATE public.organizations
        SET 
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        -- Log notification
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'trial_expired')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended';
        RETURN NEXT;
    END LOOP;
    
    -- Mark dormant (30 days no activity)
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE last_activity_at < NOW() - INTERVAL '30 days'
        AND status = 'active'
        AND dormant_at IS NULL
    LOOP
        UPDATE public.organizations
        SET 
            dormant_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_dormant')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'marked_dormant';
        RETURN NEXT;
    END LOOP;
    
    -- Suspend dormant after 60 days total inactivity
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE last_activity_at < NOW() - INTERVAL '60 days'
        AND status = 'active'
        AND dormant_at IS NOT NULL
    LOOP
        UPDATE public.organizations
        SET 
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_suspended')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended_dormant';
        RETURN NEXT;
    END LOOP;
    
    -- Schedule deletion (90 days suspended)
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE status = 'suspended'
        AND suspended_at < NOW() - INTERVAL '90 days'
        AND deletion_scheduled_at IS NULL
        AND subscription_status IS DISTINCT FROM 'active'
    LOOP
        UPDATE public.organizations
        SET 
            deletion_scheduled_at = NOW() + INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'deletion_warning_30d')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'deletion_scheduled';
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_trial_expirations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_trial_expirations"() IS 'Run weekly via cron to process lifecycle transitions';



CREATE OR REPLACE FUNCTION "public"."protect_acquisition_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Si acquisition_date ya tenía valor y se intenta cambiar
    IF OLD.acquisition_date IS NOT NULL AND NEW.acquisition_date IS DISTINCT FROM OLD.acquisition_date THEN
        RAISE EXCEPTION 'acquisition_date es inmutable. No puede ser modificada después de ser establecida.';
    END IF;
    
    -- Si acquired_by_reseller_id ya tenía valor y se intenta cambiar
    IF OLD.acquired_by_reseller_id IS NOT NULL AND NEW.acquired_by_reseller_id IS DISTINCT FROM OLD.acquired_by_reseller_id THEN
        RAISE EXCEPTION 'acquired_by_reseller_id es inmutable. No puede ser modificado después de ser establecido.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_acquisition_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_dian_evidence"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Protection Rule 1: Cannot change xml_signed once set
    IF OLD.xml_signed IS NOT NULL AND NEW.xml_signed IS DISTINCT FROM OLD.xml_signed THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify xml_signed once it has been legally sealed.';
    END IF;

    -- Protection Rule 2: Cannot change cufe once set
    IF OLD.cufe IS NOT NULL AND NEW.cufe IS DISTINCT FROM OLD.cufe THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify CUFE once it has been legally sealed.';
    END IF;

    -- Protection Rule 3: Cannot change track_id once set
    IF OLD.track_id IS NOT NULL AND NEW.track_id IS DISTINCT FROM OLD.track_id THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify TrackID once submitted to DIAN.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_dian_evidence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_limits"("target_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT p.engine, p.period, SUM(p.limit_value) as total_limit
        FROM public.billing_subscriptions s
        JOIN public.billing_packages p ON s.package_id = p.id
        WHERE s.organization_id = target_org_id AND s.status = 'active'
        GROUP BY p.engine, p.period
    LOOP
        INSERT INTO public.usage_limits (organization_id, engine, period, limit_value)
        VALUES (target_org_id, rec.engine, rec.period, rec.total_limit)
        ON CONFLICT (organization_id, engine, period)
        DO UPDATE SET limit_value = EXCLUDED.limit_value, updated_at = now();
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."provision_limits"("target_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text" DEFAULT 'starter'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Get plan ID
    SELECT id INTO v_plan_id 
    FROM public.plan_templates 
    WHERE plan_code = p_plan_code AND is_active = TRUE;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan % not found', p_plan_code;
    END IF;
    
    -- Insert limits from plan definitions
    INSERT INTO public.usage_limits (organization_id, engine, period, limit_value)
    SELECT 
        p_organization_id,
        pld.engine,
        pld.period,
        pld.limit_value
    FROM public.plan_limit_definitions pld
    WHERE pld.plan_id = v_plan_id
    ON CONFLICT (organization_id, engine, period) DO UPDATE
    SET limit_value = EXCLUDED.limit_value, updated_at = NOW();
    
    -- Update org with plan reference
    UPDATE public.organizations
    SET 
        subscription_status = 'active',
        updated_at = NOW()
    WHERE id = p_organization_id;
    
END;
$$;


ALTER FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text") IS 'Provisions usage limits for an org based on plan code';



CREATE OR REPLACE FUNCTION "public"."reconcile_agent_loads"("p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("agent_id" "uuid", "previous_load" integer, "actual_load" bigint, "was_fixed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH actual_counts AS (
        SELECT 
            c.assigned_to,
            COUNT(*)::BIGINT AS real_load
        FROM public.conversations c
        WHERE c.state = 'active' 
          AND c.status IN ('open', 'snoozed')
          AND c.assigned_to IS NOT NULL
          AND (p_org_id IS NULL OR c.organization_id = p_org_id)
        GROUP BY c.assigned_to
    ),
    agents AS (
        SELECT 
            aa.agent_id AS aid,
            aa.current_load AS old_load,
            COALESCE(ac.real_load, 0) AS new_load
        FROM public.agent_availability aa
        LEFT JOIN actual_counts ac ON ac.assigned_to = aa.agent_id
        WHERE (p_org_id IS NULL OR aa.organization_id = p_org_id)
          AND aa.current_load IS DISTINCT FROM COALESCE(ac.real_load, 0)::INT
    )
    SELECT 
        a.aid,
        a.old_load,
        a.new_load,
        true AS was_fixed
    FROM agents a;

    -- Perform the actual update
    UPDATE public.agent_availability aa
    SET current_load = COALESCE(ac.real_load, 0)::INT
    FROM (
        SELECT 
            c.assigned_to,
            COUNT(*)::BIGINT AS real_load
        FROM public.conversations c
        WHERE c.state = 'active' 
          AND c.status IN ('open', 'snoozed')
          AND c.assigned_to IS NOT NULL
          AND (p_org_id IS NULL OR c.organization_id = p_org_id)
        GROUP BY c.assigned_to
    ) ac
    WHERE aa.agent_id = ac.assigned_to
      AND (p_org_id IS NULL OR aa.organization_id = p_org_id)
      AND aa.current_load IS DISTINCT FROM ac.real_load::INT;
    
    -- Also zero out agents with no active conversations
    UPDATE public.agent_availability aa
    SET current_load = 0
    WHERE (p_org_id IS NULL OR aa.organization_id = p_org_id)
      AND aa.current_load > 0
      AND NOT EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.assigned_to = aa.agent_id
            AND c.state = 'active'
            AND c.status IN ('open', 'snoozed')
      );
END;
$$;


ALTER FUNCTION "public"."reconcile_agent_loads"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_org_activity"("p_organization_id" "uuid", "p_activity_type" "text" DEFAULT 'general'::"text", "p_points" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.organizations
    SET 
        last_activity_at = NOW(),
        activity_score = activity_score + p_points,
        -- Reset dormant status if active
        dormant_at = CASE WHEN dormant_at IS NOT NULL THEN NULL ELSE dormant_at END,
        updated_at = NOW()
    WHERE id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."record_org_activity"("p_organization_id" "uuid", "p_activity_type" "text", "p_points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_briefing_response"("p_briefing_id" "uuid", "p_field_id" "uuid", "p_value" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Upsert response
    INSERT INTO briefing_responses (briefing_id, field_id, value)
    VALUES (p_briefing_id, p_field_id, p_value)
    ON CONFLICT (briefing_id, field_id)
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW();
        
    -- Update briefing status to in_progress
    UPDATE briefings 
    SET status = 'in_progress' 
    WHERE id = p_briefing_id AND status IN ('draft', 'sent');
END;
$$;


ALTER FUNCTION "public"."save_briefing_response"("p_briefing_id" "uuid", "p_field_id" "uuid", "p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_audit_hash"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_previous_hash TEXT;
BEGIN
    -- Get previous hash for this organization
    SELECT hash INTO v_previous_hash
    FROM billing_audit_log
    WHERE organization_id = NEW.organization_id
    ORDER BY timestamp DESC, id DESC
    LIMIT 1;
    
    -- Calculate and set hash
    NEW.hash := calculate_audit_hash(
        NEW.id,
        NEW.timestamp,
        NEW.action,
        NEW.document_id,
        NEW.organization_id,
        v_previous_hash
    );
    
    NEW.previous_hash := v_previous_hash;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_audit_hash"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_conversation_bot_status"("conv_id" "uuid", "bot_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.conversations 
    SET 
        is_bot_active = bot_active,
        -- If we are disabling the bot, and the last message was inbound, start waiting timer NOW
        waiting_since = CASE 
            WHEN bot_active = false AND last_message_direction = 'inbound' THEN NOW() 
            ELSE waiting_since 
        END
    WHERE id = conv_id;
END;
$$;


ALTER FUNCTION "public"."set_conversation_bot_status"("conv_id" "uuid", "bot_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_message_organization_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM conversations
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_message_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_trial_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set trial to 14 days from creation
    IF NEW.trial_ends_at IS NULL AND NEW.subscription_status IS DISTINCT FROM 'active' THEN
        NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_trial_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_usage_parent_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.parent_organization_id IS NULL THEN
        SELECT parent_organization_id INTO NEW.parent_organization_id
        FROM public.organizations
        WHERE id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_usage_parent_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_briefing"("p_briefing_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE briefings 
    SET status = 'submitted', updated_at = NOW()
    WHERE id = p_briefing_id;
END;
$$;


ALTER FUNCTION "public"."submit_briefing"("p_briefing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_agent_channels_from_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_channel_type TEXT;
    inbox_access JSONB;
BEGIN
    inbox_access := NEW.permissions->'inbox_access';
    
    -- 1. Clear existing channel mappings for this agent
    DELETE FROM public.agent_channels 
    WHERE organization_id = NEW.organization_id AND agent_id = NEW.user_id;
    
    -- 2. If inbox_access is a list of Strings, insert them
    IF inbox_access IS NOT NULL AND jsonb_array_length(inbox_access) > 0 THEN
        FOR v_channel_type IN 
            SELECT jsonb_array_elements_text(inbox_access)
        LOOP
            INSERT INTO public.agent_channels (organization_id, agent_id, channel_type)
            VALUES (NEW.organization_id, NEW.user_id, v_channel_type)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_agent_channels_from_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_agent_channels_from_permissions_by_data"("p_org_id" "uuid", "p_user_id" "uuid", "p_permissions" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_channel_type TEXT;
    inbox_access JSONB;
BEGIN
    inbox_access := p_permissions->'inbox_access';
    DELETE FROM public.agent_channels WHERE organization_id = p_org_id AND agent_id = p_user_id;
    
    IF inbox_access IS NOT NULL AND jsonb_array_length(inbox_access) > 0 THEN
        FOR v_channel_type IN SELECT jsonb_array_elements_text(inbox_access) LOOP
            INSERT INTO public.agent_channels (organization_id, agent_id, channel_type)
            VALUES (p_org_id, p_user_id, v_channel_type) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$;


ALTER FUNCTION "public"."sync_agent_channels_from_permissions_by_data"("p_org_id" "uuid", "p_user_id" "uuid", "p_permissions" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_conversation_assignment_to_lead"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR (TG_OP = 'INSERT') THEN
        UPDATE public.leads SET assigned_to = NEW.assigned_to WHERE id = NEW.lead_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_conversation_assignment_to_lead"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_lead_value"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    -- Only update if total changed
    if (old.total_amount is distinct from new.total_amount) then
        update public.leads
        set 
            value = new.total_amount,
            updated_at = now()
        where id = new.lead_id;
    end if;
    
    return new;
end;
$$;


ALTER FUNCTION "public"."sync_lead_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_member_details"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update the member record with data from auth.users
    -- We join on the NEW.user_id
    UPDATE public.organization_members
    SET 
        full_name = COALESCE(
            (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = NEW.user_id), 
            'Unknown'
        ),
        email = (SELECT email FROM auth.users WHERE id = NEW.user_id),
        avatar_url = (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = NEW.user_id)
    WHERE user_id = NEW.user_id AND organization_id = NEW.organization_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_member_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_quote_to_lead"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When quote is accepted, move lead to 'won'
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        UPDATE leads 
        SET status = 'won', quote_status = 'accepted'
        WHERE quote_id = NEW.id;
    END IF;
    
    -- When quote is rejected, move lead to 'lost'
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        UPDATE leads 
        SET status = 'lost', quote_status = 'rejected'
        WHERE quote_id = NEW.id;
    END IF;
    
    -- When quote is sent, move lead to 'negotiation'
    IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
        UPDATE leads 
        SET status = 'negotiation', quote_status = 'sent'
        WHERE quote_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_quote_to_lead"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_provision_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.provision_limits(OLD.organization_id);
    ELSE
        PERFORM public.provision_limits(NEW.organization_id);
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trigger_provision_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_provision_org_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Provision starter limits by default
    PERFORM public.provision_org_limits(NEW.id, 'starter');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_provision_org_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_briefing_response_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_briefing_response_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contract_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contract_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    clean_text text;
    sender_type_val text;
    v_new_unread_count int;
BEGIN
    clean_text := public.get_content_text(NEW.content);
    
    -- Sender type detection
    sender_type_val := COALESCE(
        NEW.metadata->>'sender_type', 
        CASE 
            WHEN NEW.sender = 'System' THEN 'neutral' 
            WHEN NEW.sender = 'Automation Bot' THEN 'bot' 
            ELSE 'human' 
        END
    );

    -- Unread Count Logic (RESTORED)
    IF NEW.direction = 'inbound' THEN
        SELECT COALESCE(unread_count, 0) + 1 INTO v_new_unread_count 
        FROM public.conversations 
        WHERE id = NEW.conversation_id;
    ELSE
        v_new_unread_count := 0; -- Reset on ANY outbound
    END IF;

    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message = LEFT(clean_text, 255), -- Restore as STRING preview for UI comp
        unread_count = v_new_unread_count,
        -- SURGICAL Bot State Logic
        is_bot_active = CASE 
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'bot' THEN true
            WHEN NEW.direction = 'outbound' AND sender_type_val = 'human' THEN false
            ELSE is_bot_active
        END,
        -- COMPATIBILITY: Restore 'last_message_direction' for Widget
        metadata = conversations.metadata || jsonb_build_object(
            'last_message_direction', NEW.direction,
            'sender_type', sender_type_val
        ),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    last_wait_duration INTERVAL;
    current_sender_type text;
    last_dir text;
BEGIN
    current_sender_type := NEW.metadata->>'sender_type';
    last_dir := NEW.metadata->>'last_message_direction';
    
    -- INBOUND Logic
    IF last_dir = 'inbound' THEN
        IF NEW.is_bot_active = false AND NEW.waiting_since IS NULL THEN
            NEW.waiting_since := NOW();
        END IF;
    END IF;

    -- OUTBOUND Logic
    IF last_dir = 'outbound' THEN
        -- If human agent replied
        IF current_sender_type = 'human' THEN
            IF NEW.waiting_since IS NOT NULL THEN
                last_wait_duration := NOW() - NEW.waiting_since;
                NEW.last_responded_at := NOW();
                
                IF NEW.average_response_time_seconds = 0 THEN
                    NEW.average_response_time_seconds := EXTRACT(EPOCH FROM last_wait_duration)::INTEGER;
                ELSE
                    NEW.average_response_time_seconds := (NEW.average_response_time_seconds + EXTRACT(EPOCH FROM last_wait_duration)::INTEGER) / 2;
                END IF;
                
                NEW.waiting_since := NULL;
                NEW.is_bot_active := FALSE;
            END IF;
        END IF;
    END IF;

    -- Archive/Closed Logic
    IF NEW.state = 'archived' OR NEW.status = 'closed' THEN
        NEW.waiting_since := NULL;
        NEW.is_bot_active := FALSE;
    END IF;

    -- Ensure unread_count is never null
    IF NEW.unread_count IS NULL THEN
        NEW.unread_count := 0;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE leads SET last_activity_at = NOW() WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lead_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pipeline_stages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pipeline_stages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scheduled_job_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_scheduled_job_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settlement_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the settlement's amount_paid and status
    UPDATE staff_payroll_settlements
    SET 
        amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM staff_payments
            WHERE settlement_id = NEW.settlement_id
        ),
        payment_status = CASE
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM staff_payments WHERE settlement_id = NEW.settlement_id) = 0 
                THEN 'pending'
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM staff_payments WHERE settlement_id = NEW.settlement_id) >= (base_amount + bonuses - deductions)
                THEN 'paid'
            ELSE 'partial'
        END,
        updated_at = NOW()
    WHERE id = NEW.settlement_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_settlement_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_workflow_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tier_price DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Get tier price
    SELECT price_monthly INTO v_tier_price
    FROM public.branding_tiers
    WHERE id = p_new_tier_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid tier ID'
        );
    END IF;
    
    -- Update organization
    UPDATE public.organizations
    SET 
        branding_tier_id = p_new_tier_id,
        branding_tier_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Upsert add-on subscription
    INSERT INTO public.organization_add_ons (
        organization_id,
        add_on_type,
        tier_id,
        price_monthly,
        status,
        next_billing_date
    ) VALUES (
        p_organization_id,
        'branding',
        p_new_tier_id,
        v_tier_price,
        'active',
        CURRENT_DATE + INTERVAL '1 month'
    )
    ON CONFLICT (organization_id, add_on_type) 
    DO UPDATE SET
        tier_id = EXCLUDED.tier_id,
        price_monthly = EXCLUDED.price_monthly,
        status = 'active',
        activated_at = NOW(),
        next_billing_date = CURRENT_DATE + INTERVAL '1 month',
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'tier', p_new_tier_id,
        'price', v_tier_price
    );
END;
$$;


ALTER FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") IS 'Upgrades organization branding tier and creates/updates add-on subscription';



CREATE OR REPLACE FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Re-provision with new plan limits
    PERFORM public.provision_org_limits(p_organization_id, p_new_plan_code);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") IS 'Upgrades an organization to a new plan';



CREATE OR REPLACE FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_module RECORD;
    v_org RECORD;
    v_missing_deps TEXT[] := ARRAY[]::TEXT[];
    v_conflicts TEXT[] := ARRAY[]::TEXT[];
    v_dep JSONB;
BEGIN
    -- Get module metadata
    SELECT * INTO v_module
    FROM public.system_modules
    WHERE key = p_module_key;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Module not found',
            'type', 'not_found'
        );
    END IF;
    
    -- Get organization vertical (if column exists)
    BEGIN
        SELECT vertical INTO v_org
        FROM public.organizations
        WHERE id = p_organization_id;
    EXCEPTION WHEN undefined_column THEN
        -- Vertical column doesn't exist, skip this check
        v_org.vertical := NULL;
    END;
    
    -- Check compatibility with vertical (if both exist)
    IF v_org.vertical IS NOT NULL AND 
       v_module.compatible_verticals IS NOT NULL AND
       v_module.compatible_verticals != ARRAY['*'] AND 
       NOT (v_org.vertical = ANY(v_module.compatible_verticals)) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Module not compatible with ' || v_org.vertical || ' vertical',
            'type', 'incompatible_vertical'
        );
    END IF;
    
    -- Check conflicts
    IF v_module.conflicts_with IS NOT NULL THEN
        SELECT ARRAY_AGG(conflict)
        INTO v_conflicts
        FROM unnest(v_module.conflicts_with) AS conflict
        WHERE conflict = ANY(p_current_active_modules);
        
        IF array_length(v_conflicts, 1) > 0 THEN
            RETURN jsonb_build_object(
                'valid', false,
                'error', 'Conflicts with: ' || array_to_string(v_conflicts, ', '),
                'conflicts', v_conflicts,
                'type', 'module_conflict'
            );
        END IF;
    END IF;
    
    -- Check required dependencies
    IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
        FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
        LOOP
            IF (v_dep->>'type') = 'required' AND 
               NOT ((v_dep->>'module_key') = ANY(p_current_active_modules)) THEN
                v_missing_deps := array_append(v_missing_deps, v_dep->>'module_key');
            END IF;
        END LOOP;
        
        IF array_length(v_missing_deps, 1) > 0 THEN
            RETURN jsonb_build_object(
                'valid', true,
                'warnings', ARRAY['Missing required dependencies'],
                'auto_enable_suggestions', v_missing_deps,
                'type', 'missing_dependencies'
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object('valid', true);
END;
$$;


ALTER FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) IS 'Validates if a module can be activated for an organization';



CREATE TABLE IF NOT EXISTS "public"."agent_availability" (
    "agent_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text",
    "max_capacity" integer DEFAULT 5,
    "current_load" integer DEFAULT 0,
    "auto_assign_enabled" boolean DEFAULT false,
    "timezone" "text" DEFAULT 'America/Bogota'::"text",
    "work_schedule" "jsonb" DEFAULT '{}'::"jsonb",
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_availability_new_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'away'::"text", 'offline'::"text", 'busy'::"text"])))
);


ALTER TABLE "public"."agent_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_availability_backup_before_sync" (
    "id" "uuid",
    "organization_id" "uuid",
    "agent_id" "uuid",
    "status" character varying(20),
    "last_seen_at" timestamp with time zone,
    "current_load" integer,
    "max_capacity" integer,
    "auto_assign_enabled" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."agent_availability_backup_before_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_channels" (
    "organization_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "channel_type" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_presence" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text",
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_presence_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'away'::"text", 'offline'::"text"])))
);


ALTER TABLE "public"."agent_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_qa_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "agent_id" "text" NOT NULL,
    "report" "jsonb" NOT NULL,
    "messages_analyzed_count" integer DEFAULT 0,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_qa_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_skills" (
    "organization_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "skill" "text" NOT NULL,
    "proficiency" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_skills_new_proficiency_check" CHECK ((("proficiency" >= 1) AND ("proficiency" <= 5)))
);


ALTER TABLE "public"."agent_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_skills_backup_before_sync" (
    "id" "uuid",
    "organization_id" "uuid",
    "agent_id" "uuid",
    "skill" character varying(50),
    "proficiency" integer,
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."agent_skills_backup_before_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."agent_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "task_type" "text" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "response_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."ai_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider_id" "text" NOT NULL,
    "api_key_encrypted" "text" NOT NULL,
    "priority" integer DEFAULT 1,
    "monthly_limit_credits" numeric,
    "used_credits_current_month" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "exhausted_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_image_generation_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "prompt_used" "text",
    "image_url" "text",
    "status" "text" DEFAULT 'success'::"text",
    "model_used" "text" DEFAULT 'dall-e-3'::"text"
);


ALTER TABLE "public"."ai_image_generation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_providers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "capabilities" "jsonb" DEFAULT '{}'::"jsonb",
    "base_url" "text",
    "models" "jsonb" DEFAULT '[]'::"jsonb",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope_type" "text" NOT NULL,
    "scope_id" "text" NOT NULL,
    "is_clawdbot_enabled" boolean DEFAULT true,
    "daily_token_limit" integer DEFAULT 1000,
    "monthly_budget_usd" numeric(10,2) DEFAULT 0,
    "model_overrides" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."ai_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "suggested_responses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "selected_response" "text",
    "was_edited" boolean DEFAULT false,
    "final_message" "text",
    "model_used" "text" DEFAULT 'gpt-4'::"text",
    "generation_time_ms" integer,
    "context_messages_count" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "used_at" timestamp with time zone
);


ALTER TABLE "public"."ai_suggestions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ai_suggestion_analytics" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "total_suggestions",
    "count"("selected_response") AS "times_used",
    "round"(((("count"("selected_response"))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "usage_rate",
    "avg"("generation_time_ms") AS "avg_generation_time_ms",
    "count"(
        CASE
            WHEN ("was_edited" = false) THEN 1
            ELSE NULL::integer
        END) AS "used_without_edit",
    "model_used",
    "date_trunc"('day'::"text", "created_at") AS "date"
   FROM "public"."ai_suggestions"
  GROUP BY "model_used", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."ai_suggestion_analytics" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_suggestion_analytics" IS 'AI suggestion analytics - security invoker view';



CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "credential_id" "uuid",
    "provider_id" "text" NOT NULL,
    "model" "text" NOT NULL,
    "task_type" "text" NOT NULL,
    "input_tokens" integer DEFAULT 0,
    "output_tokens" integer DEFAULT 0,
    "cost_estimated" numeric(10,6) DEFAULT 0,
    "status" "text" DEFAULT 'success'::"text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "parent_organization_id" "uuid",
    "engine" "text" NOT NULL,
    "action" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_events_engine_check" CHECK (("engine" = ANY (ARRAY['automation'::"text", 'messaging'::"text", 'ai'::"text", 'documents'::"text", 'storage'::"text"])))
);


ALTER TABLE "public"."usage_events" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."analytics_daily_usage" AS
 SELECT "organization_id",
    "engine",
    "action",
    ("date_trunc"('day'::"text", "occurred_at"))::"date" AS "usage_date",
    "sum"("quantity") AS "units_consumed",
    "count"(*) AS "event_count"
   FROM "public"."usage_events"
  GROUP BY "organization_id", "engine", "action", ("date_trunc"('day'::"text", "occurred_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."analytics_daily_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "assigned_to" "uuid",
    "assignment_method" character varying(50),
    "rule_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assignment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "strategy" character varying(50) DEFAULT 'round-robin'::character varying,
    "assign_to" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assignment_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "text" NOT NULL,
    "photo_url" "text" NOT NULL,
    "device_lat" numeric(10,8),
    "device_lng" numeric(11,8),
    "accuracy_meters" double precision,
    "distance_to_location" integer,
    "is_valid" boolean DEFAULT true,
    "fraud_flags" "text"[] DEFAULT '{}'::"text"[],
    "device_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "attendance_logs_type_check" CHECK (("type" = ANY (ARRAY['check_in'::"text", 'check_out'::"text", 'break_start'::"text", 'break_end'::"text"])))
);


ALTER TABLE "public"."attendance_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_shifts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "date" "date" NOT NULL,
    "first_in" timestamp with time zone,
    "last_out" timestamp with time zone,
    "total_break_minutes" integer DEFAULT 0,
    "total_worked_minutes" integer DEFAULT 0,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ordinary_minutes" integer DEFAULT 0,
    "extra_minutes_pending" integer DEFAULT 0,
    "extra_minutes_approved" integer DEFAULT 0
);


ALTER TABLE "public"."attendance_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "step_id" "text" NOT NULL,
    "resume_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    CONSTRAINT "automation_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."automation_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billable_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reseller_chain" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "event_type" "text" NOT NULL,
    "description" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "invoice_id" "uuid",
    "stripe_payment_intent_id" "text",
    "stripe_charge_id" "text",
    "client_age_months" integer DEFAULT 0 NOT NULL,
    "settled" boolean DEFAULT false,
    "settlement_id" "uuid",
    "commission_calculated" numeric(10,2),
    "commission_rule_id" "uuid",
    "commission_phase" "text",
    "event_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "billable_events_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "billable_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['subscription_base'::"text", 'subscription_addon'::"text", 'addon'::"text", 'overage'::"text", 'upsell'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."billable_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."billable_events" IS 'Registro inmutable de cada evento facturable. Fuente de verdad para liquidaciones.';



COMMENT ON COLUMN "public"."billable_events"."reseller_chain" IS 'Cadena de resellers capturada al crear. Formato: [{"org_id": "uuid", "level": 1}]. Solo nivel 1 cobra en MVP.';



CREATE TABLE IF NOT EXISTS "public"."billing_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text" NOT NULL,
    "document_id" "uuid",
    "user_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "before" "jsonb",
    "after" "jsonb",
    "changes" "text"[],
    "ip_address" "inet",
    "user_agent" "text",
    "source" "text" NOT NULL,
    "hash" "text" NOT NULL,
    "previous_hash" "text",
    CONSTRAINT "billing_audit_log_source_check" CHECK (("source" = ANY (ARRAY['WEB'::"text", 'API'::"text", 'CRON'::"text", 'EXTERNAL'::"text"])))
);


ALTER TABLE "public"."billing_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_audit_log" IS 'Immutable audit trail for billing operations. No updates or deletes allowed.';



COMMENT ON COLUMN "public"."billing_audit_log"."hash" IS 'SHA-256 hash of entry + previous hash (blockchain-like chain)';



COMMENT ON COLUMN "public"."billing_audit_log"."previous_hash" IS 'Hash of previous entry in chain for this organization';



CREATE TABLE IF NOT EXISTS "public"."billing_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "service_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "due_date" timestamp with time zone,
    "amount" numeric DEFAULT 0 NOT NULL,
    "status" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "billing_cycles_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'invoiced'::"text", 'paid'::"text", 'cancelled'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."billing_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_overage_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "organization_type" "text",
    "engine" "text" NOT NULL,
    "unit_price" numeric(10,4) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."billing_overage_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "engine" "text" NOT NULL,
    "limit_value" integer NOT NULL,
    "period" "text" DEFAULT 'month'::"text" NOT NULL,
    "price_monthly" numeric(10,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "billing_packages_period_check" CHECK (("period" = ANY (ARRAY['day'::"text", 'month'::"text"])))
);


ALTER TABLE "public"."billing_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "package_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "current_period_start" timestamp with time zone DEFAULT "now"(),
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "billing_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text"])))
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branding_tiers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "price_monthly" numeric(10,2) DEFAULT 0 NOT NULL,
    "description" "text",
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "restrictions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "capabilities" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."branding_tiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."branding_tiers" IS 'Catalog of branding tiers available for organizations';



COMMENT ON COLUMN "public"."branding_tiers"."features" IS 'JSON object with enabled features for this tier';



COMMENT ON COLUMN "public"."branding_tiers"."restrictions" IS 'JSON object with restrictions/limits for this tier';



COMMENT ON COLUMN "public"."branding_tiers"."capabilities" IS 'Capacidades base que otorga este tier (ej: CAN_CUSTOMIZE_DOMAIN: true).';



CREATE TABLE IF NOT EXISTS "public"."briefing_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "step_id" "uuid",
    "label" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."briefing_field_type" NOT NULL,
    "required" boolean DEFAULT false,
    "options" "jsonb",
    "placeholder" "text",
    "help_text" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."briefing_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."briefing_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."briefing_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."briefing_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "structure" "jsonb" DEFAULT '[]'::"jsonb",
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."briefing_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."briefings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "client_id" "uuid",
    "status" "public"."briefing_status" DEFAULT 'draft'::"public"."briefing_status",
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "service_id" "uuid",
    "deleted_at" timestamp with time zone,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."briefings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcast_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "broadcast_recipients_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."broadcast_recipients" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcast_recipients" IS 'Tracks individual recipient status for broadcasts';



CREATE TABLE IF NOT EXISTS "public"."broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "message" "text" NOT NULL,
    "channel" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb",
    "total_recipients" integer DEFAULT 0,
    "sent_count" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "read_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "campaign_id" "uuid",
    CONSTRAINT "broadcasts_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'sms'::"text", 'email'::"text"]))),
    CONSTRAINT "broadcasts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."broadcasts" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcasts" IS 'Stores broadcast campaigns for mass messaging';



CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "name" "text" NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_definitions" (
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider_key" "text",
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channel_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_channel_id" "text" NOT NULL,
    "name" "text",
    "identifier" "text" NOT NULL,
    "status" "text" DEFAULT 'connected'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channels_provider_check" CHECK (("provider" = ANY (ARRAY['meta_cloud'::"text", 'evolution_api'::"text", 'resend'::"text", 'twilio'::"text"])))
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT 'slate'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."client_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "icon" "text"
);


ALTER TABLE "public"."client_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "lead_id" "uuid",
    "number" character varying(50),
    "title" "text",
    "content" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "pdf_url" "text",
    "vault_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "contracts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'signed'::character varying, 'void'::character varying, 'expired'::character varying])::"text"[])))
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


COMMENT ON TABLE "public"."contracts" IS 'Stores generated contracts and their lifecycle statuses';



CREATE TABLE IF NOT EXISTS "public"."conversation_intents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "intent" "text" NOT NULL,
    "confidence" double precision NOT NULL,
    "extracted_entities" "jsonb" DEFAULT '{}'::"jsonb",
    "suggested_team" "text",
    "suggested_agent_skills" "text"[],
    "auto_routed" boolean DEFAULT false,
    "model_used" "text" DEFAULT 'gpt-3.5-turbo'::"text",
    "processing_time_ms" integer,
    "detected_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversation_intents_confidence_check" CHECK ((("confidence" >= (0)::double precision) AND ("confidence" <= (1)::double precision)))
);


ALTER TABLE "public"."conversation_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "channel" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to" "uuid",
    "last_message" "text",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "unread_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "state" "text" DEFAULT 'active'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_profile" "jsonb" DEFAULT '{}'::"jsonb",
    "overall_sentiment" "text",
    "sentiment_trend" "jsonb" DEFAULT '[]'::"jsonb",
    "phone" "text",
    "snoozed_until" timestamp with time zone,
    "connection_id" "uuid",
    "last_auto_reply_at" timestamp with time zone,
    "last_message_preview" "text",
    "client_id" "uuid",
    "waiting_since" timestamp with time zone,
    "is_bot_active" boolean DEFAULT false,
    "last_message_direction" "text",
    "last_responded_at" timestamp with time zone,
    "average_response_time_seconds" integer DEFAULT 0,
    CONSTRAINT "conversations_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'messenger'::"text", 'instagram'::"text", 'evolution'::"text", 'email'::"text", 'sms'::"text"]))),
    CONSTRAINT "conversations_overall_sentiment_check" CHECK (("overall_sentiment" = ANY (ARRAY['positive'::"text", 'neutral'::"text", 'negative'::"text", 'urgent'::"text"]))),
    CONSTRAINT "conversations_priority_check" CHECK (("priority" = ANY (ARRAY['urgent'::"text", 'high'::"text", 'normal'::"text", 'low'::"text"]))),
    CONSTRAINT "conversations_state_check" CHECK (("state" = ANY (ARRAY['active'::"text", 'archived'::"text", 'spam'::"text", 'deleted'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'snoozed'::"text"])))
);

ALTER TABLE ONLY "public"."conversations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversations"."last_auto_reply_at" IS 'Timestamp of last auto-reply sent, used for rate limiting';



COMMENT ON COLUMN "public"."conversations"."client_id" IS 'Link to clients table (for manually created contacts independent of leads)';



CREATE TABLE IF NOT EXISTS "public"."crm_lead_tags" (
    "lead_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_lead_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#808080'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" DEFAULT 'follow_up'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "due_date" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "reminder_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."snapshot_status" DEFAULT 'pending'::"public"."snapshot_status",
    "storage_path" "text",
    "file_size_bytes" bigint,
    "checksum" "text",
    "included_modules" "text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."data_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "total_amount" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deal_carts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'locked'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."deal_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dian_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "cufe" "text",
    "track_id" "text",
    "xml_unsigned" "text",
    "xml_signed" "text",
    "dian_status" "public"."dian_status" DEFAULT 'EN_PROCESO'::"public"."dian_status" NOT NULL,
    "dian_response_xml" "text",
    "dian_message" "text",
    "validation_errors" "jsonb",
    "environment" "text" DEFAULT 'TEST'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dian_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domain_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "triggered_by" "public"."event_trigger_type" DEFAULT 'system'::"public"."event_trigger_type" NOT NULL,
    "actor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."domain_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "trigger_event" "text" NOT NULL,
    "time_offset" interval DEFAULT '00:00:00'::interval,
    "template_id" "uuid",
    "is_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "template_key" "text" NOT NULL,
    "variant_name" "text" DEFAULT 'standard'::"text",
    "is_active" boolean DEFAULT false,
    "subject_template" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "design_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emitters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "display_name" "text" NOT NULL,
    "legal_name" "text" NOT NULL,
    "emitter_type" "public"."emitter_type" DEFAULT 'NATURAL'::"public"."emitter_type" NOT NULL,
    "identification_type" "text" DEFAULT 'CC'::"text" NOT NULL,
    "identification_number" "text" NOT NULL,
    "allowed_document_types" "text"[] DEFAULT '{CUENTA_DE_COBRO}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "address" "text",
    "email" "text",
    "phone" "text",
    "logo_url" "text",
    "verification_digit" "text",
    "organization_id" "uuid"
);


ALTER TABLE "public"."emitters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flags" IS 'Per-organization feature toggles within modules. Common features:
- crm.lead_scoring: Automatic lead scoring
- crm.ai_suggestions: AI-powered suggestions in inbox
- crm.auto_assignment: Auto-assign leads to agents
- invoicing.auto_reminders: Automatic payment reminders
- invoicing.recurring: Recurring invoices
- marketing.ab_testing: A/B testing in campaigns
- ai.agent_qa: Agent QA analysis
- ai.sentiment: Sentiment analysis';



CREATE TABLE IF NOT EXISTS "public"."global_dashboard_banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_type" "text" NOT NULL,
    "title" "text",
    "description" "jsonb",
    "cta_text" "text",
    "cta_url" "text",
    "media_type" "text" DEFAULT 'json_lottie'::"text",
    "media_url" "text",
    "layout_pos" "text" DEFAULT 'right'::"text",
    "theme" "text" DEFAULT 'light'::"text",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."global_dashboard_banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hosting_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "domain_url" "text" NOT NULL,
    "provider_name" "text",
    "server_ip" "text",
    "plan_name" "text",
    "cpanel_url" "text",
    "credentials" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "renewal_date" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "hosting_accounts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."hosting_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid",
    "platform" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "ad_account_id" "text",
    "page_id" "text",
    "is_active" boolean DEFAULT true,
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "settings" "jsonb" DEFAULT '{"show_ads": true, "show_social": true}'::"jsonb",
    CONSTRAINT "integration_configs_platform_check" CHECK (("platform" = 'meta'::"text"))
);


ALTER TABLE "public"."integration_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "provider_key" "text" NOT NULL,
    "connection_name" "text" NOT NULL,
    "credentials" "jsonb" DEFAULT '{}'::"jsonb",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_pipeline_stage_id" "uuid",
    "working_hours" "jsonb" DEFAULT '{"enabled": false}'::"jsonb",
    "auto_reply_when_offline" "text",
    "welcome_message" "text",
    "is_primary" boolean DEFAULT false,
    "provider_id" "uuid"
);


ALTER TABLE "public"."integration_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_connections" IS 'Stores active external integrations for organizations';



COMMENT ON COLUMN "public"."integration_connections"."credentials" IS 'SENSITIVE: Should hold encrypted tokens/keys';



COMMENT ON COLUMN "public"."integration_connections"."default_pipeline_stage_id" IS 'Auto-create deals in this stage for new contacts from this channel';



COMMENT ON COLUMN "public"."integration_connections"."working_hours" IS 'Schedule configuration for auto-replies';



COMMENT ON COLUMN "public"."integration_connections"."is_primary" IS 'If true, this line is used for default outbound messages';



CREATE TABLE IF NOT EXISTS "public"."integration_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'messaging'::"text" NOT NULL,
    "icon_url" "text",
    "is_premium" boolean DEFAULT false,
    "is_enabled" boolean DEFAULT true,
    "config_schema" "jsonb" DEFAULT '{}'::"jsonb",
    "documentation_url" "text",
    "setup_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_providers" IS 'Catalog of available integrations for the marketplace';



COMMENT ON COLUMN "public"."integration_providers"."key" IS 'Unique provider identifier used in code (e.g., meta_whatsapp)';



COMMENT ON COLUMN "public"."integration_providers"."is_premium" IS 'If true, may require paid plan to install';



COMMENT ON COLUMN "public"."integration_providers"."config_schema" IS 'JSON Schema defining required credentials for setup';



CREATE TABLE IF NOT EXISTS "public"."intent_routing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "intent" "text" NOT NULL,
    "min_confidence" double precision DEFAULT 0.7,
    "auto_assign_to_team" "text",
    "required_skills" "text"[],
    "add_tags" "text"[],
    "set_priority" "text",
    "trigger_workflow_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "intent_routing_rules_set_priority_check" CHECK (("set_priority" = ANY (ARRAY['urgent'::"text", 'high'::"text", 'normal'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."intent_routing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid" NOT NULL,
    "number" "text" NOT NULL,
    "date" "date" NOT NULL,
    "due_date" "date",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "pdf_url" "text",
    "sent" boolean DEFAULT false,
    "archived" boolean DEFAULT false,
    "service_id" "uuid",
    "deleted_at" timestamp with time zone,
    "emitter_id" "uuid",
    "document_type" "text",
    "is_late_issued" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "organization_id" "uuid" NOT NULL,
    "payment_status" "text" DEFAULT 'UNPAID'::"text",
    "billing_cycle_id" "uuid",
    CONSTRAINT "invoices_document_type_check" CHECK (("document_type" = ANY (ARRAY['CUENTA_DE_COBRO'::"text", 'FACTURA_ELECTRONICA'::"text", 'COTIZACION'::"text"]))),
    CONSTRAINT "invoices_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['UNPAID'::"text", 'PARTIALLY_PAID'::"text", 'PAID'::"text", 'OVERDUE'::"text"]))),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text" DEFAULT 'General'::"text",
    "source" "text" DEFAULT 'manual'::"text",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "embedding" "extensions"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "audience" "public"."knowledge_audience" DEFAULT 'both'::"public"."knowledge_audience"
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "company_name" "text",
    "email" "text",
    "phone" "text",
    "status" "text" DEFAULT 'open'::"text",
    "notes" "text",
    "organization_id" "uuid" NOT NULL,
    "value" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'USD'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "priority" "text" DEFAULT 'normal'::"text",
    "source" "text" DEFAULT 'manual'::"text",
    "marketing_opted_out" boolean DEFAULT false,
    "opted_out_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "quote_id" "uuid",
    "quote_status" "text",
    "source_connection_id" "uuid",
    "avatar_url" "text",
    "address" "text",
    "portal_short_token" "text",
    "portal_token_created_at" timestamp with time zone DEFAULT "now"(),
    "portal_token_expires_at" timestamp with time zone,
    "portal_token_never_expires" boolean DEFAULT true,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "score" integer DEFAULT 0,
    "last_scored_at" timestamp with time zone,
    "estimated_value" numeric,
    "contact_type" "text" DEFAULT 'lead'::"text",
    "nit" "text",
    "logo_url" "text",
    "portal_token" "uuid",
    "portal_config" "jsonb" DEFAULT '{}'::"jsonb",
    "facebook" "text" DEFAULT ''::"text",
    "instagram" "text" DEFAULT ''::"text",
    "tiktok" "text" DEFAULT ''::"text",
    "website" "text" DEFAULT ''::"text",
    "linkedin" "text" DEFAULT ''::"text",
    "youtube" "text" DEFAULT ''::"text",
    "twitter" "text" DEFAULT ''::"text",
    "deleted_at" timestamp with time zone,
    "migrated_from_client_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "category_id" "uuid",
    "assigned_to" "uuid",
    "master_contact_id" "uuid",
    "is_master_contact" boolean DEFAULT false,
    CONSTRAINT "leads_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['lead'::"text", 'prospect'::"text", 'client'::"text", 'partner'::"text"])))
);

ALTER TABLE ONLY "public"."leads" REPLICA IDENTITY FULL;


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON TABLE "public"."leads" IS 'CRM leads with dynamic pipeline stages - status values come from pipeline_stages table';



COMMENT ON COLUMN "public"."leads"."user_id" IS 'Optional link to a specific admin user. organization_id is the primary ownership field.';



COMMENT ON COLUMN "public"."leads"."status" IS 'Dynamic status from pipeline_stages.status_key (e.g. open, contacted, qualified, won, lost)';



COMMENT ON COLUMN "public"."leads"."marketing_opted_out" IS 'If true, exclude from all marketing campaigns';



COMMENT ON COLUMN "public"."leads"."source_connection_id" IS 'WhatsApp line that originally captured this lead';



COMMENT ON COLUMN "public"."leads"."address" IS 'Physical address. Populated when contact_type = client.';



COMMENT ON COLUMN "public"."leads"."portal_short_token" IS 'Short human-readable token for portal access.';



COMMENT ON COLUMN "public"."leads"."contact_type" IS 'Discriminator for UI routing: lead=CRM pipeline, client=billing section, prospect=pre-qualified, partner=vendor/supplier';



COMMENT ON COLUMN "public"."leads"."nit" IS 'Fiscal ID (NIT/RUT). Populated when contact_type = client.';



COMMENT ON COLUMN "public"."leads"."portal_token" IS 'UUID token for client portal access.';



COMMENT ON COLUMN "public"."leads"."deleted_at" IS 'Soft delete timestamp. Records with non-null deleted_at are hidden from queries.';



COMMENT ON COLUMN "public"."leads"."migrated_from_client_id" IS 'If this record was migrated from the legacy clients table, stores the original client.id for audit.';



COMMENT ON COLUMN "public"."leads"."master_contact_id" IS 'References the "Master Contact" (contact_type=client) for this lead. Allows multiple pipeline deals for one person.';



CREATE TABLE IF NOT EXISTS "public"."lifecycle_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "notification_type" "text" NOT NULL,
    "sent_at" timestamp without time zone DEFAULT "now"(),
    "email_sent_to" "text",
    CONSTRAINT "lifecycle_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['trial_ending_7d'::"text", 'trial_ending_1d'::"text", 'trial_expired'::"text", 'account_dormant'::"text", 'account_suspended'::"text", 'deletion_warning_30d'::"text", 'deletion_warning_7d'::"text", 'account_deleted'::"text"])))
);


ALTER TABLE "public"."lifecycle_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifest_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text" DEFAULT 'application/pdf'::"text",
    "status" "text" DEFAULT 'processed'::"text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manifest_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifest_imeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "imei" "text" NOT NULL,
    "page_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manifest_imeis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_audiences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" DEFAULT 'dynamic'::"text" NOT NULL,
    "filter_config" "jsonb" DEFAULT '{}'::"jsonb",
    "cached_count" integer DEFAULT 0,
    "last_count_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."marketing_audiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "goal" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "total_enrolled" integer DEFAULT 0,
    "total_completed" integer DEFAULT 0,
    "engagement_score" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "audience_id" "uuid",
    "scheduled_for" timestamp with time zone
);


ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."marketing_campaigns"."audience_id" IS 'Links campaign to a saved audience for bulk enrollment';



COMMENT ON COLUMN "public"."marketing_campaigns"."scheduled_for" IS 'When to start the campaign (null = immediate on activation)';



CREATE TABLE IF NOT EXISTS "public"."marketing_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "sequence_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_step_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "last_error" "text",
    "next_run_at" timestamp with time zone DEFAULT "now"(),
    "last_run_at" timestamp with time zone,
    "execution_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "campaign_id" "uuid"
);


ALTER TABLE "public"."marketing_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "name" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketing_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "sequence_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "delay_config" "jsonb" DEFAULT '{}'::"jsonb",
    "condition_config" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketing_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "reaction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "direction" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "external_id" "text",
    "sender" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sentiment" "text",
    "sentiment_score" double precision,
    "detected_emotions" "jsonb" DEFAULT '[]'::"jsonb",
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "messages_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'messenger'::"text", 'instagram'::"text", 'evolution'::"text", 'email'::"text", 'sms'::"text"]))),
    CONSTRAINT "messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "messages_sentiment_check" CHECK (("sentiment" = ANY (ARRAY['positive'::"text", 'neutral'::"text", 'negative'::"text", 'urgent'::"text"]))),
    CONSTRAINT "messages_sentiment_score_check" CHECK ((("sentiment_score" >= ('-1.0'::numeric)::double precision) AND ("sentiment_score" <= (1.0)::double precision)))
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messaging_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_id" "uuid",
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" DEFAULT 'text'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "components" "jsonb" DEFAULT '[]'::"jsonb",
    "meta_id" character varying(100)
);


ALTER TABLE "public"."messaging_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messaging_templates"."components" IS 'Stores the Meta Template Structure (Header, Body, Footer, Buttons)';



CREATE TABLE IF NOT EXISTS "public"."meta_ads_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid",
    "spend" numeric(10,2) DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "ctr" numeric(5,2) DEFAULT 0,
    "cpc" numeric(5,2) DEFAULT 0,
    "roas" numeric(5,2) DEFAULT 0,
    "campaigns" "jsonb" DEFAULT '[]'::"jsonb",
    "snapshot_date" "date" DEFAULT CURRENT_DATE,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meta_ads_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meta_org_ads_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "snapshot_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "spend" numeric(12,2) DEFAULT 0,
    "impressions" bigint DEFAULT 0,
    "clicks" bigint DEFAULT 0,
    "cpc" numeric(10,2) DEFAULT 0,
    "ctr" numeric(10,4) DEFAULT 0,
    "roas" numeric(10,2) DEFAULT 0,
    "campaigns" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meta_org_ads_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meta_social_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_id" "uuid",
    "followers" integer DEFAULT 0,
    "reach" integer DEFAULT 0,
    "engagement" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "top_posts" "jsonb" DEFAULT '[]'::"jsonb",
    "snapshot_date" "date" DEFAULT CURRENT_DATE,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "facebook_data" "jsonb" DEFAULT '{}'::"jsonb",
    "instagram_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meta_social_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "subscription_id" "uuid",
    "client_id" "uuid",
    "read" boolean DEFAULT false,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "valid_notification" CHECK ((("subscription_id" IS NOT NULL) OR ("client_id" IS NOT NULL)))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_add_ons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "add_on_type" "text" NOT NULL,
    "tier_id" "text",
    "price_monthly" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "activated_at" timestamp without time zone DEFAULT "now"(),
    "cancelled_at" timestamp without time zone,
    "next_billing_date" "date",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "check_add_on_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text", 'suspended'::"text"]))),
    CONSTRAINT "check_price_non_negative" CHECK (("price_monthly" >= (0)::numeric))
);


ALTER TABLE "public"."organization_add_ons" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_add_ons" IS 'Tracks active add-on subscriptions for organizations';



COMMENT ON COLUMN "public"."organization_add_ons"."add_on_type" IS 'Type of add-on: branding, domain, analytics';



COMMENT ON COLUMN "public"."organization_add_ons"."tier_id" IS 'Specific tier subscribed to (e.g., custom, whitelabel)';



CREATE TABLE IF NOT EXISTS "public"."organization_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_billing_profiles" (
    "organization_id" "uuid" NOT NULL,
    "tax_id" "text",
    "legal_name" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_billing_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "subscription_product_id" "uuid",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "owner_id" "uuid",
    "next_billing_date" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "suspended_reason" "text",
    "base_app_slug" "text" DEFAULT 'agency-manager'::"text",
    "manual_module_overrides" "jsonb" DEFAULT '[]'::"jsonb",
    "custom_admin_domain" "text",
    "custom_portal_domain" "text",
    "use_custom_domains" boolean DEFAULT false,
    "branding_tier_id" "text" DEFAULT 'basic'::"text",
    "branding_tier_activated_at" timestamp without time zone,
    "branding_custom_config" "jsonb" DEFAULT '{}'::"jsonb",
    "active_app_id" "text",
    "app_activated_at" timestamp without time zone,
    "app_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "vertical_key" "text",
    "status_reason" "text",
    "payment_status" "text" DEFAULT 'good_standing'::"text",
    "parent_organization_id" "uuid",
    "organization_type" "text" DEFAULT 'client'::"text",
    "vault_config" "jsonb" DEFAULT '{"enabled": false, "frequency": "weekly"}'::"jsonb",
    "rate_limit_config" "jsonb" DEFAULT '{"ai_requests_per_day": 100, "requests_per_minute": 500}'::"jsonb",
    "acquired_by_reseller_id" "uuid",
    "acquisition_date" timestamp without time zone,
    "trial_ends_at" timestamp without time zone,
    "last_activity_at" timestamp without time zone DEFAULT "now"(),
    "activity_score" integer DEFAULT 0,
    "dormant_at" timestamp without time zone,
    "deletion_scheduled_at" timestamp without time zone,
    "deletion_warning_sent_at" timestamp without time zone,
    "capabilities" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted_at" timestamp with time zone,
    "allow_direct_billing" boolean DEFAULT true,
    CONSTRAINT "cannot_remove_core_modules" CHECK ((("manual_module_overrides" IS NULL) OR (NOT ("manual_module_overrides" ?& ARRAY['dashboard'::"text", 'clients'::"text", 'billing'::"text"])))),
    CONSTRAINT "different_custom_domains" CHECK ((("custom_admin_domain" IS NULL) OR ("custom_portal_domain" IS NULL) OR ("custom_admin_domain" <> "custom_portal_domain"))),
    CONSTRAINT "organizations_organization_type_check" CHECK (("organization_type" = ANY (ARRAY['platform'::"text", 'reseller'::"text", 'operator'::"text", 'client'::"text"]))),
    CONSTRAINT "organizations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'past_due'::"text", 'archived'::"text"]))),
    CONSTRAINT "organizations_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text"]))),
    CONSTRAINT "valid_custom_admin_domain" CHECK ((("custom_admin_domain" IS NULL) OR ("custom_admin_domain" ~ '^[a-z0-9\-\.]+$'::"text"))),
    CONSTRAINT "valid_custom_portal_domain" CHECK ((("custom_portal_domain" IS NULL) OR ("custom_portal_domain" ~ '^[a-z0-9\-\.]+$'::"text")))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."suspended_at" IS 'When account was suspended';



COMMENT ON COLUMN "public"."organizations"."custom_admin_domain" IS 'Organization-specific admin domain (overrides platform, requires super_admin approval)';



COMMENT ON COLUMN "public"."organizations"."custom_portal_domain" IS 'Organization-specific portal domain (overrides platform, requires super_admin approval)';



COMMENT ON COLUMN "public"."organizations"."use_custom_domains" IS 'If true, use custom_*_domain instead of platform defaults';



COMMENT ON COLUMN "public"."organizations"."branding_tier_id" IS 'Current active branding tier';



COMMENT ON COLUMN "public"."organizations"."branding_custom_config" IS 'Custom branding configuration (logo URLs, colors, etc.)';



COMMENT ON COLUMN "public"."organizations"."active_app_id" IS 'Currently active app template for this organization';



COMMENT ON COLUMN "public"."organizations"."app_metadata" IS 'App-specific configuration and customizations';



COMMENT ON COLUMN "public"."organizations"."updated_at" IS 'Last update timestamp (auto-managed)';



COMMENT ON COLUMN "public"."organizations"."vault_config" IS 'Configuration for automated Data Vault backups (enabled, frequency, last_run, etc.)';



COMMENT ON COLUMN "public"."organizations"."rate_limit_config" IS 'Per-organization rate limit configuration. Keys: requests_per_minute, ai_requests_per_day';



COMMENT ON COLUMN "public"."organizations"."acquired_by_reseller_id" IS 'Reseller que adquirió este cliente. Solo para tracking, el cliente SIEMPRE pertenece a Pixy.';



COMMENT ON COLUMN "public"."organizations"."acquisition_date" IS 'Fecha de adquisición. INMUTABLE - determina la antigüedad para cálculo de comisiones.';



COMMENT ON COLUMN "public"."organizations"."trial_ends_at" IS 'When trial period expires (14 days from creation)';



COMMENT ON COLUMN "public"."organizations"."last_activity_at" IS 'Last meaningful user activity timestamp';



COMMENT ON COLUMN "public"."organizations"."activity_score" IS 'Cumulative activity points for engagement scoring';



COMMENT ON COLUMN "public"."organizations"."dormant_at" IS 'When account was marked dormant (30 days inactive)';



COMMENT ON COLUMN "public"."organizations"."deletion_scheduled_at" IS 'Scheduled hard deletion date';



COMMENT ON COLUMN "public"."organizations"."capabilities" IS 'Mapa de capacidades (flags booleano) que sobrescriben o extienden las del tier.';



CREATE OR REPLACE VIEW "public"."organization_health_scores" WITH ("security_invoker"='true') AS
 SELECT "id" AS "organization_id",
    "name",
    "status",
    "payment_status",
    (((100 -
        CASE
            WHEN ("payment_status" <> 'good_standing'::"text") THEN 50
            ELSE 0
        END) -
        CASE
            WHEN ("status" = 'suspended'::"text") THEN 100
            ELSE 0
        END) -
        CASE
            WHEN ("status" = 'limited'::"text") THEN 30
            ELSE 0
        END) AS "health_score"
   FROM "public"."organizations" "o";


ALTER VIEW "public"."organization_health_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "timezone" "text" DEFAULT 'America/Bogota'::"text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "geofence_radius_meters" integer DEFAULT 100,
    "manager_id" "uuid",
    "business_hours" "jsonb" DEFAULT '{"friday": {"open": "08:00", "close": "18:00", "is_closed": false}, "monday": {"open": "08:00", "close": "18:00", "is_closed": false}, "sunday": {"is_closed": true}, "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "saturday": {"open": "09:00", "close": "14:00", "is_closed": false}, "thursday": {"open": "08:00", "close": "18:00", "is_closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false}}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "country" "text" DEFAULT 'Colombia'::"text",
    "state" "text",
    "city" "text"
);


ALTER TABLE "public"."organization_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "full_name" "text",
    "email" "text",
    "avatar_url" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "role_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" "public"."payment_method_type" DEFAULT 'MANUAL'::"public"."payment_method_type" NOT NULL,
    "title" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instructions" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."organization_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system_role" boolean DEFAULT false,
    "hierarchy_level" integer DEFAULT 1,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_saas_products" (
    "organization_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "activated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "organization_saas_products_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."organization_saas_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "last_number" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "agency_name" "text" DEFAULT 'My Agency'::"text" NOT NULL,
    "agency_legal_name" "text",
    "agency_logo_url" "text",
    "agency_email" "text",
    "agency_phone" "text",
    "agency_website" "text",
    "agency_country" "text" DEFAULT 'Colombia'::"text",
    "agency_currency" "text" DEFAULT 'COP'::"text",
    "agency_timezone" "text" DEFAULT 'America/Bogota'::"text",
    "default_language" "text" DEFAULT 'es'::"text",
    "portal_language" "text" DEFAULT 'es'::"text",
    "date_format" "text" DEFAULT 'DD/MM/YYYY'::"text",
    "currency_format" "text" DEFAULT 'es-CO'::"text",
    "legal_text" "text",
    "portal_enabled" boolean DEFAULT true,
    "portal_subdomain" "text",
    "portal_welcome_message" "text",
    "portal_footer_text" "text",
    "portal_logo_url" "text",
    "portal_primary_color" "text",
    "portal_secondary_color" "text",
    "portal_show_agency_name" boolean DEFAULT true,
    "portal_show_contact_info" boolean DEFAULT true,
    "portal_modules" "jsonb" DEFAULT '{"invoices": true, "payments": true, "briefings": true}'::"jsonb",
    "comm_whatsapp_number" "text",
    "comm_whatsapp_prefix" "text" DEFAULT '57'::"text",
    "comm_sender_name" "text",
    "comm_assisted_mode" boolean DEFAULT true,
    "comm_templates" "jsonb" DEFAULT '{"invoice_sent": "Hola {{cliente}}, te enviamos tu factura #{{factura}} por valor de {{monto}}. Puedes verla y pagarla aquí: {{link}}", "briefing_sent": "Hola {{cliente}}, necesitamos tu ayuda con este briefing para avanzar: {{link}}", "payment_reminder": "Hola {{cliente}}, recordatorio amable de tu factura #{{factura}} pendiente por {{monto}}. Link de pago: {{link}}", "briefing_completed": "¡Gracias {{cliente}}! Hemos recibido tu briefing completado.", "payment_confirmation": "¡Gracias {{cliente}}! Hemos recibido tu pago de {{monto}} por la factura #{{factura}}."}'::"jsonb",
    "trash_shortcut" "text" DEFAULT 'ctrl+alt+p'::"text",
    "organization_id" "uuid" NOT NULL,
    "show_all_portal_modules" boolean DEFAULT false,
    "document_primary_color" "text" DEFAULT '#6D28D9'::"text",
    "document_secondary_color" "text" DEFAULT '#EC4899'::"text",
    "document_logo_url" "text",
    "document_logo_size" "text" DEFAULT 'medium'::"text",
    "document_template_style" "text" DEFAULT 'modern'::"text",
    "document_show_watermark" boolean DEFAULT true,
    "document_watermark_text" "text",
    "document_font_family" "text" DEFAULT 'Inter'::"text",
    "document_header_text_color" "text" DEFAULT '#1F2937'::"text",
    "document_footer_text_color" "text" DEFAULT '#6B7280'::"text",
    "wompi_public_key" "text",
    "wompi_integrity_secret" "text",
    "wompi_currency" character varying(3) DEFAULT 'COP'::character varying,
    "portal_favicon_url" "text",
    "portal_login_background_url" "text",
    "portal_login_background_color" "text" DEFAULT '#F3F4F6'::"text",
    "email_footer_text" "text",
    "show_powered_by_footer" boolean DEFAULT true,
    "brand_font_family" "text" DEFAULT 'Inter'::"text",
    "main_logo_url" "text",
    "isotipo_url" "text",
    "social_facebook" "text",
    "social_instagram" "text",
    "social_twitter" "text",
    "custom_domain" "text",
    "custom_domain_status" "text" DEFAULT 'pending'::"text",
    "invoice_footer" "text",
    "social_linkedin" "text",
    "social_youtube" "text",
    "main_logo_light_url" "text",
    "email_style" "text" DEFAULT 'neo'::"text",
    CONSTRAINT "organization_settings_document_logo_size_check" CHECK (("document_logo_size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"]))),
    CONSTRAINT "organization_settings_document_template_style_check" CHECK (("document_template_style" = ANY (ARRAY['minimal'::"text", 'modern'::"text", 'classic'::"text"])))
);


ALTER TABLE "public"."organization_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organization_settings"."default_language" IS 'Default language for this vertical/organization (es, en, etc)';



COMMENT ON COLUMN "public"."organization_settings"."document_font_family" IS 'Font family for PDF documents';



COMMENT ON COLUMN "public"."organization_settings"."document_header_text_color" IS 'Hex color for document headers (PDF)';



COMMENT ON COLUMN "public"."organization_settings"."document_footer_text_color" IS 'Hex color for document footers (PDF)';



COMMENT ON COLUMN "public"."organization_settings"."wompi_integrity_secret" IS 'Wompi integrity secret for signature generation. Keep this value secure and never expose in client-side code.';



COMMENT ON COLUMN "public"."organization_settings"."wompi_currency" IS 'Currency code for Wompi transactions (e.g., COP, USD). Defaults to COP.';



COMMENT ON COLUMN "public"."organization_settings"."portal_favicon_url" IS 'Custom favicon for client portal (module_whitelabel premium)';



COMMENT ON COLUMN "public"."organization_settings"."portal_login_background_url" IS 'Custom background image for portal login screen (module_whitelabel premium)';



COMMENT ON COLUMN "public"."organization_settings"."portal_login_background_color" IS 'Background color for portal login screen, defaults to light gray (module_whitelabel premium)';



COMMENT ON COLUMN "public"."organization_settings"."email_footer_text" IS 'Custom footer text for transactional emails (module_whitelabel premium)';



COMMENT ON COLUMN "public"."organization_settings"."show_powered_by_footer" IS 'Whether to show "Powered by" footer in portal. Can only be disabled with module_whitelabel.';



COMMENT ON COLUMN "public"."organization_settings"."brand_font_family" IS 'Custom font family for portal branding (module_whitelabel premium)';



COMMENT ON COLUMN "public"."organization_settings"."email_style" IS 'Estilo de plantilla para correos (minimal, corporate, bold, neo, swiss)';



CREATE TABLE IF NOT EXISTS "public"."organization_smtp_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "public"."smtp_provider_type" DEFAULT 'custom'::"public"."smtp_provider_type",
    "host" "text" NOT NULL,
    "port" integer NOT NULL,
    "user_email" "text" NOT NULL,
    "password_encrypted" "text" NOT NULL,
    "iv" "text" NOT NULL,
    "from_email" "text" NOT NULL,
    "from_name" "text" NOT NULL,
    "is_verified" boolean DEFAULT false,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_smtp_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "document_id" "text",
    "phone" "text",
    "email" "text",
    "role" "text" DEFAULT 'staff'::"text",
    "pin_code" "text",
    "access_token" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "photo_url" "text",
    "shift_type" "text" DEFAULT 'split'::"text",
    "expected_hours_per_day" numeric(4,2) DEFAULT 8.0,
    "break_duration_minutes" integer DEFAULT 120,
    "work_schedule" "jsonb",
    CONSTRAINT "organization_staff_shift_type_check" CHECK (("shift_type" = ANY (ARRAY['continuous'::"text", 'split'::"text"])))
);


ALTER TABLE "public"."organization_staff" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organization_staff"."work_schedule" IS 'Horario individualizado del colaborador, capaz de soportar split blocks (block_1 y block_2)';



CREATE TABLE IF NOT EXISTS "public"."passkey_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge" "text" NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:05:00'::interval) NOT NULL,
    CONSTRAINT "passkey_challenges_type_check" CHECK (("type" = ANY (ARRAY['registration'::"text", 'authentication'::"text"])))
);


ALTER TABLE "public"."passkey_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "provider" "text" DEFAULT 'stripe_connect'::"text",
    "stripe_account_id" "text",
    "onboarding_complete" boolean DEFAULT false,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "payout_schedule" "text" DEFAULT 'monthly'::"text",
    "minimum_payout_amount" numeric(10,2) DEFAULT 50.00,
    "country" "text",
    "default_currency" "text" DEFAULT 'USD'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_accounts_payout_schedule_check" CHECK (("payout_schedule" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."payment_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_accounts" IS 'Cuentas de Stripe Connect para payouts a resellers.';



CREATE TABLE IF NOT EXISTS "public"."payment_config_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gateway_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changes" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_config_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_gateway_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gateway_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false,
    "is_live_mode" boolean DEFAULT false,
    "public_key" "text",
    "secret_key_ref" "text",
    "webhook_secret_ref" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "platform_fee_percent" numeric(5,2) DEFAULT 0,
    "platform_fee_fixed_cents" integer DEFAULT 0,
    "supports_connect" boolean DEFAULT false,
    "supports_subscriptions" boolean DEFAULT false,
    "supports_invoicing" boolean DEFAULT false,
    "last_tested_at" timestamp without time zone,
    "test_result" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "payment_gateway_config_gateway_name_check" CHECK (("gateway_name" = ANY (ARRAY['stripe'::"text", 'mercadopago'::"text", 'paypal'::"text", 'wompi'::"text"])))
);


ALTER TABLE "public"."payment_gateway_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_gateway_config" IS 'Platform payment gateway configuration (Stripe, MercadoPago, etc.)';



COMMENT ON COLUMN "public"."payment_gateway_config"."secret_key_ref" IS 'Reference to env var name, not actual key';



CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference" "text" NOT NULL,
    "amount_in_cents" bigint NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "invoice_ids" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_process_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "pipeline_stage_id" "uuid" NOT NULL,
    "process_type" "text" NOT NULL,
    "process_state_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_process_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status_key" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "color" "text" DEFAULT 'bg-gray-500'::"text",
    "icon" "text" DEFAULT 'circle'::"text",
    "is_active" boolean DEFAULT true,
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pipeline_id" "uuid"
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "process_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipelines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_limit_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid",
    "engine" "text" NOT NULL,
    "period" "text" NOT NULL,
    "limit_value" integer NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."plan_limit_definitions" OWNER TO "postgres";


COMMENT ON TABLE "public"."plan_limit_definitions" IS 'Defines limits per plan template per engine';



CREATE TABLE IF NOT EXISTS "public"."plan_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_code" "text" NOT NULL,
    "plan_name" "text" NOT NULL,
    "price_monthly" integer NOT NULL,
    "price_yearly" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."plan_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."plan_templates" IS 'Defines available subscription plans (Starter, Professional, Business, Scale)';



CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" bigint NOT NULL,
    "agency_name" "text" DEFAULT 'Pixy'::"text" NOT NULL,
    "main_logo_url" "text",
    "portal_logo_url" "text",
    "favicon_url" "text",
    "brand_color_primary" "text" DEFAULT '#4F46E5'::"text",
    "brand_color_secondary" "text" DEFAULT '#EC4899'::"text",
    "login_background_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "admin_domain" "text" DEFAULT 'control.pixy.com.co'::"text",
    "portal_domain" "text" DEFAULT 'mi.pixy.com.co'::"text",
    "domain_updated_at" timestamp with time zone,
    "main_logo_light_url" "text",
    "email_style" "text" DEFAULT 'neo'::"text",
    CONSTRAINT "different_platform_domains" CHECK (("admin_domain" <> "portal_domain")),
    CONSTRAINT "platform_settings_singleton_check" CHECK (("id" = 1)),
    CONSTRAINT "valid_admin_domain" CHECK (("admin_domain" ~ '^[a-z0-9\-\.]+$'::"text")),
    CONSTRAINT "valid_portal_domain" CHECK (("portal_domain" ~ '^[a-z0-9\-\.]+$'::"text"))
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."platform_settings"."admin_domain" IS 'Default admin panel domain for all verticals';



COMMENT ON COLUMN "public"."platform_settings"."portal_domain" IS 'Default client portal domain for all verticals';



COMMENT ON COLUMN "public"."platform_settings"."domain_updated_at" IS 'Timestamp of last domain configuration update';



COMMENT ON COLUMN "public"."platform_settings"."email_style" IS 'Estilo global por defecto para correos de la plataforma';



ALTER TABLE "public"."platform_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."platform_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."portal_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "organization_id" "uuid",
    "token_used" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "access_type" "text" DEFAULT 'view'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portal_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_apps" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "long_description" "text",
    "category" "text",
    "vertical_compatibility" "text"[] DEFAULT ARRAY['*'::"text"],
    "icon" "text" DEFAULT 'Package'::"text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "banner_image_url" "text",
    "price_monthly" numeric(10,2) DEFAULT 0,
    "trial_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "display_name_singular" "text" DEFAULT 'Solution Template'::"text",
    "display_name_plural" "text" DEFAULT 'Solution Templates'::"text",
    "recommended_for_verticals" "text"[] DEFAULT ARRAY['*'::"text"],
    "portal_template" "text" DEFAULT 'b2b_dashboard'::"text" NOT NULL,
    "space_category" "text" DEFAULT 'agency'::"text",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "pricing_plans" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."saas_apps" OWNER TO "postgres";


COMMENT ON TABLE "public"."saas_apps" IS 'Solution Templates: Pre-configured bundles of modules designed for specific business verticals (e.g., Marketing Agency Starter)';



COMMENT ON COLUMN "public"."saas_apps"."vertical_compatibility" IS 'Array of compatible verticals, or [*] for all';



COMMENT ON COLUMN "public"."saas_apps"."metadata" IS 'Additional metadata: target_audience, features_highlight, testimonials, etc.';



COMMENT ON COLUMN "public"."saas_apps"."display_name_singular" IS 'UI label for single template (e.g., "Solution Template")';



COMMENT ON COLUMN "public"."saas_apps"."display_name_plural" IS 'UI label for multiple templates (e.g., "Solution Templates")';



COMMENT ON COLUMN "public"."saas_apps"."recommended_for_verticals" IS 'Array of vertical slugs this template is recommended for. Use [*] for universal templates.';



CREATE TABLE IF NOT EXISTS "public"."saas_apps_portal_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "text",
    "module_slug" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "portal_tab_label" "text" NOT NULL,
    "portal_icon_key" "text" DEFAULT 'LayoutDashboard'::"text",
    "portal_component_key" "text" NOT NULL,
    "target_portal" "text" DEFAULT 'client'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_apps_portal_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."portal_modules_by_app" WITH ("security_invoker"='true') AS
 SELECT "a"."slug" AS "app_slug",
    "a"."name" AS "app_name",
    "pc"."module_slug",
    "pc"."portal_tab_label",
    "pc"."portal_icon_key",
    "pc"."portal_component_key",
    "pc"."target_portal",
    "pc"."display_order",
    "pc"."is_enabled"
   FROM ("public"."saas_apps_portal_config" "pc"
     JOIN "public"."saas_apps" "a" ON (("a"."id" = "pc"."app_id")))
  WHERE ("pc"."is_enabled" = true)
  ORDER BY "a"."slug", "pc"."target_portal", "pc"."display_order";


ALTER VIEW "public"."portal_modules_by_app" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "current_state" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "locked" boolean DEFAULT false,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "history" "jsonb"[] DEFAULT ARRAY[]::"jsonb"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "process_instances_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."process_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "allowed_next_states" "text"[],
    "is_terminal" boolean DEFAULT false,
    "is_initial" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "suggested_actions" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."process_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "platform_role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "job_title" "text",
    "phone" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "full_name" "text",
    "language_preference" "text" DEFAULT 'es'::"text",
    CONSTRAINT "profiles_platform_role_check" CHECK (("platform_role" = ANY (ARRAY['user'::"text", 'super_admin'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."language_preference" IS 'User interface language preference';



CREATE TABLE IF NOT EXISTS "public"."quick_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "shortcut" "text",
    "category" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quick_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_settings" (
    "organization_id" "uuid" NOT NULL,
    "vertical" "text" DEFAULT 'custom'::"text",
    "approve_label" "text" DEFAULT '✅ Aprobar Presupuesto'::"text",
    "reject_label" "text" DEFAULT '❌ Rechazar / Cambios'::"text",
    "actions_config" "jsonb" DEFAULT '{"reject": {"reasons": ["Precio Alto", "Alcance Incorrecto", "Eligió Competencia", "Otro"], "ask_reason": true}, "approve": {"notify_team": true, "send_message": true, "move_to_stage": "won"}}'::"jsonb",
    "template_config" "jsonb" DEFAULT '{"footer": "Gracias por su confianza.", "header": "COTIZACIÓN FORMAL"}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mostrador_config" "jsonb",
    CONSTRAINT "quote_settings_vertical_check" CHECK (("vertical" = ANY (ARRAY['agency'::"text", 'ecommerce'::"text", 'reservation'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."quote_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid",
    "number" "text" NOT NULL,
    "date" "date" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total" numeric NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "pdf_url" "text",
    "lead_id" "uuid",
    "service_id" "uuid",
    "deleted_at" timestamp with time zone,
    "emitter_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "quotes_entity_check" CHECK (((("client_id" IS NOT NULL) AND ("lead_id" IS NULL)) OR (("client_id" IS NULL) AND ("lead_id" IS NOT NULL)))),
    CONSTRAINT "quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reseller_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reseller_org_id" "uuid" NOT NULL,
    "client_org_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "description" "text",
    "evidence_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "activity_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "reseller_activity_log_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['addon_sale'::"text", 'upsell'::"text", 'support_session'::"text", 'training'::"text", 'consultation'::"text", 'onboarding_assist'::"text"])))
);


ALTER TABLE "public"."reseller_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."reseller_activity_log" IS 'Registro de actividad del reseller con clientes. Requerido para comisiones en Fase 2.';



CREATE TABLE IF NOT EXISTS "public"."resto_table_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "table_id" "uuid" NOT NULL,
    "opened_by" "uuid",
    "closed_by" "uuid",
    "opened_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "closed_at" timestamp with time zone,
    "guest_count" integer DEFAULT 1,
    "status" "public"."resto_session_status" DEFAULT 'active'::"public"."resto_session_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."resto_table_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resto_tables" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "zone_id" "uuid" NOT NULL,
    "table_identifier" character varying(100) NOT NULL,
    "capacity" integer DEFAULT 4,
    "shape" "public"."resto_table_shape" DEFAULT 'square'::"public"."resto_table_shape",
    "pos_x" double precision DEFAULT 0 NOT NULL,
    "pos_y" double precision DEFAULT 0 NOT NULL,
    "width" double precision DEFAULT 100 NOT NULL,
    "height" double precision DEFAULT 100 NOT NULL,
    "rotation" double precision DEFAULT 0 NOT NULL,
    "status" "public"."resto_table_status" DEFAULT 'available'::"public"."resto_table_status",
    "current_session_id" "uuid",
    "qr_token" character varying(255) DEFAULT "encode"("extensions"."gen_random_bytes"(12), 'hex'::"text"),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."resto_tables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resto_zones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "grid_width" integer DEFAULT 2000,
    "grid_height" integer DEFAULT 2000,
    "visual_elements" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "background_style" character varying(50) DEFAULT 'dots'::character varying
);


ALTER TABLE "public"."resto_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revenue_share_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reseller_org_id" "uuid",
    "phase_name" "text" NOT NULL,
    "phase_start_month" integer NOT NULL,
    "phase_end_month" integer,
    "commission_percent" numeric(5,2) NOT NULL,
    "eligible_event_types" "text"[] NOT NULL,
    "requires_reseller_activity" boolean DEFAULT false,
    "activity_window_days" integer DEFAULT 30,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "effective_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revenue_share_rules_activity_window_days_check" CHECK (("activity_window_days" > 0)),
    CONSTRAINT "revenue_share_rules_check" CHECK ((("phase_end_month" IS NULL) OR ("phase_end_month" >= "phase_start_month"))),
    CONSTRAINT "revenue_share_rules_check1" CHECK ((("effective_to" IS NULL) OR ("effective_to" >= "effective_from"))),
    CONSTRAINT "revenue_share_rules_commission_percent_check" CHECK ((("commission_percent" >= (0)::numeric) AND ("commission_percent" <= (100)::numeric))),
    CONSTRAINT "revenue_share_rules_eligible_event_types_check" CHECK (("eligible_event_types" <@ ARRAY['subscription_base'::"text", 'subscription_addon'::"text", 'addon'::"text", 'overage'::"text", 'upsell'::"text", 'one_time'::"text"])),
    CONSTRAINT "revenue_share_rules_phase_name_check" CHECK (("phase_name" = ANY (ARRAY['activation'::"text", 'retention'::"text", 'stable'::"text"]))),
    CONSTRAINT "revenue_share_rules_phase_start_month_check" CHECK (("phase_start_month" >= 0))
);


ALTER TABLE "public"."revenue_share_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."revenue_share_rules" IS 'Reglas de comisión por fase. NULL en reseller_org_id = regla global.';



COMMENT ON COLUMN "public"."revenue_share_rules"."activity_window_days" IS 'Ventana de días para verificar actividad del reseller (solo si requires_reseller_activity = true)';



CREATE TABLE IF NOT EXISTS "public"."saas_app_add_ons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "app_id" "text",
    "add_on_type" "text" NOT NULL,
    "tier_id" "text",
    "is_recommended" boolean DEFAULT true,
    "is_required" boolean DEFAULT false,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_app_add_ons" OWNER TO "postgres";


COMMENT ON TABLE "public"."saas_app_add_ons" IS 'Optional add-on modules that can be purchased separately for templates';



COMMENT ON COLUMN "public"."saas_app_add_ons"."discount_percent" IS 'Discount percentage when bundled with app';



CREATE TABLE IF NOT EXISTS "public"."saas_app_modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "app_id" "text",
    "module_key" "text" NOT NULL,
    "auto_enable" boolean DEFAULT true,
    "is_core" boolean DEFAULT false,
    "is_optional" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_app_modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."saas_app_modules" IS 'Modules included in each solution template';



COMMENT ON COLUMN "public"."saas_app_modules"."auto_enable" IS 'Automatically enabled when app is assigned';



COMMENT ON COLUMN "public"."saas_app_modules"."is_core" IS 'Core modules are always enabled and cannot be disabled';



COMMENT ON COLUMN "public"."saas_app_modules"."is_optional" IS 'User can choose whether to enable this module';



CREATE SEQUENCE IF NOT EXISTS "public"."saas_platform_invoice_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."saas_platform_invoice_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_platform_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "sequential_number" integer NOT NULL,
    "amount_total" numeric(12,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "issuer_name" "text" DEFAULT 'Cristian Camilo Gomez Penagos'::"text" NOT NULL,
    "issuer_nit" "text" DEFAULT '1110458437'::"text" NOT NULL,
    "issuer_location" "text" DEFAULT 'Ibague, Colombia'::"text" NOT NULL,
    "issuer_activity" "text" DEFAULT 'Desarrollo y Licenciamiento de Software'::"text" NOT NULL,
    "billing_period_start" "date" NOT NULL,
    "billing_period_end" "date" NOT NULL,
    "notes" "text",
    "payment_transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "recipient_email" "text",
    "include_tax" boolean DEFAULT false,
    "tax_rate" numeric(5,2) DEFAULT 19.00,
    "tax_amount" numeric(12,2) DEFAULT 0.00,
    "amount_subtotal" numeric(12,2),
    "client_tax_id" "text",
    "client_address" "text",
    "client_legal_name" "text"
);


ALTER TABLE "public"."saas_platform_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_product_modules" (
    "product_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "is_default_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."saas_product_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_product_packages" (
    "product_id" "uuid" NOT NULL,
    "package_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."saas_product_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "pricing_model" "text" NOT NULL,
    "base_price" numeric(10,2) DEFAULT 0.00,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "saas_products_pricing_model_check" CHECK (("pricing_model" = ANY (ARRAY['subscription'::"text", 'one_time'::"text"]))),
    CONSTRAINT "saas_products_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."saas_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status",
    "current_period_start" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "payment_gateway" "text" DEFAULT 'wompi'::"text" NOT NULL,
    "payment_method_id" "text",
    "last_payment_at" timestamp with time zone,
    "last_payment_error" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "custom_price" numeric(10,2),
    "billing_cycle" "text" DEFAULT 'monthly'::"text",
    "bypass_until" timestamp with time zone,
    "admin_notes" "text",
    "billing_method" character varying(20) DEFAULT 'AUTOMATIC'::character varying,
    CONSTRAINT "saas_subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'semi_annual'::"text", 'annual'::"text"]))),
    CONSTRAINT "saas_subscriptions_payment_gateway_check" CHECK (("payment_gateway" = ANY (ARRAY['wompi'::"text", 'stripe'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."saas_subscriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."saas_subscriptions"."custom_price" IS 'Organization-specific price override for the platform subscription.';



COMMENT ON COLUMN "public"."saas_subscriptions"."bypass_until" IS 'Administrator-set date to bypass billing charges. Access remains active until this date without transactions.';



CREATE TABLE IF NOT EXISTS "public"."saved_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" DEFAULT 'db9d1288-80ab-48df-b130-a0739881c6f2'::"uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" DEFAULT 'General'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "icon" "text",
    "is_favorite" boolean DEFAULT false
);


ALTER TABLE "public"."saved_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "resource_entity" "text" NOT NULL,
    "resource_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sentiment_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text",
    "sentiment_score" double precision,
    "detected_keywords" "text"[],
    "auto_escalated" boolean DEFAULT false,
    "escalated_to" "uuid",
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sentiment_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['negative_spike'::"text", 'urgent_keywords'::"text", 'escalation_needed'::"text"]))),
    CONSTRAINT "sentiment_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."sentiment_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sentiment_analytics" WITH ("security_invoker"='true') AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "sentiment",
    "count"(*) AS "message_count",
    "avg"("sentiment_score") AS "avg_score",
    "count"(DISTINCT "conversation_id") AS "unique_conversations"
   FROM "public"."messages"
  WHERE ("sentiment" IS NOT NULL)
  GROUP BY ("date_trunc"('day'::"text", "created_at")), "sentiment"
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, "sentiment";


ALTER VIEW "public"."sentiment_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "type" "text" NOT NULL,
    "frequency" "text",
    "base_price" numeric DEFAULT 0,
    "is_visible_in_portal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "insights_access" "text" DEFAULT 'NONE'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_system_template" boolean DEFAULT false,
    "image_url" "text",
    "ai_generated_image" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "service_catalog_frequency_check" CHECK (("frequency" = ANY (ARRAY['monthly'::"text", 'biweekly'::"text", 'quarterly'::"text", 'semiannual'::"text", 'yearly'::"text"]))),
    CONSTRAINT "service_catalog_insights_access_check" CHECK (("insights_access" = ANY (ARRAY['NONE'::"text", 'ORGANIC'::"text", 'ADS'::"text", 'ALL'::"text"]))),
    CONSTRAINT "service_catalog_type_check" CHECK (("type" = ANY (ARRAY['recurring'::"text", 'one_off'::"text", 'product'::"text"])))
);


ALTER TABLE "public"."service_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_catalog" IS 'Service Catalog with strict RLS: View for all members, Manage for Admins/Managers.';



COMMENT ON COLUMN "public"."service_catalog"."category" IS 'Product category for grouping in selector';



COMMENT ON COLUMN "public"."service_catalog"."metadata" IS 'Flexible storage for vertical-specific fields (e.g. briefing_template_id for agencies, property_specs for real estate)';



COMMENT ON COLUMN "public"."service_catalog"."is_system_template" IS 'If true, this item serves as a blueprint for seeding other organizations catalogues';



COMMENT ON COLUMN "public"."service_catalog"."image_url" IS 'URL to product thumbnail image';



CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "icon" "text" DEFAULT 'Folder'::"text",
    "color" "text" DEFAULT 'gray'::"text",
    "scope" "text" DEFAULT 'tenant'::"text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "service_categories_scope_check" CHECK (("scope" = ANY (ARRAY['tenant'::"text", 'system'::"text", 'template'::"text"])))
);


ALTER TABLE "public"."service_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "start_date" "date",
    "end_date" "date",
    "type" "text" DEFAULT 'recurring'::"text",
    "frequency" "text",
    "amount" numeric DEFAULT 0,
    "quantity" numeric DEFAULT 1,
    "next_billing_date" timestamp with time zone,
    "emitter_id" "uuid",
    "document_type" "text",
    "deleted_at" timestamp with time zone,
    "service_start_date" timestamp with time zone,
    "billing_cycle_start_date" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_visible_in_portal" boolean DEFAULT false,
    "is_catalog_item" boolean DEFAULT false,
    "briefing_template_id" "uuid",
    "base_price" numeric DEFAULT 0,
    "category" "text",
    "organization_id" "uuid" NOT NULL,
    "duration_minutes" integer DEFAULT 60,
    "pricing_model" "text" DEFAULT 'fixed'::"text",
    "worker_count" integer DEFAULT 1,
    "insights_access" "text" DEFAULT 'NONE'::"text",
    CONSTRAINT "services_frequency_check" CHECK (("frequency" = ANY (ARRAY['monthly'::"text", 'biweekly'::"text", 'quarterly'::"text", 'semiannual'::"text", 'yearly'::"text", 'one-time'::"text"]))),
    CONSTRAINT "services_insights_access_check" CHECK (("insights_access" = ANY (ARRAY['NONE'::"text", 'ORGANIC'::"text", 'ADS'::"text", 'ALL'::"text"]))),
    CONSTRAINT "services_pricing_model_check" CHECK (("pricing_model" = ANY (ARRAY['fixed'::"text", 'hourly'::"text", 'sq_meter'::"text"]))),
    CONSTRAINT "services_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "services_type_check" CHECK (("type" = ANY (ARRAY['recurring'::"text", 'one_off'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reseller_org_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "gross_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_commission" numeric(12,2) DEFAULT 0 NOT NULL,
    "platform_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_payout" numeric(12,2) DEFAULT 0 NOT NULL,
    "breakdown" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "event_count" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "stripe_payout_id" "text",
    "stripe_transfer_id" "text",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "settlements_check" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "settlements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."settlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."settlements" IS 'Liquidaciones mensuales. Requieren aprobación manual antes de payout.';



COMMENT ON COLUMN "public"."settlements"."breakdown" IS 'Desglose: {"activation": {"events": 5, "gross": 1000, "commission": 250}, ...}';



CREATE TABLE IF NOT EXISTS "public"."staff_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "settlement_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_date" "date" NOT NULL,
    "reference_number" "text",
    "bank_name" "text",
    "account_last_4" "text",
    "notes" "text",
    "registered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "staff_payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'check'::"text", 'mobile_payment'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."staff_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_payroll_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "period_name" "text" NOT NULL,
    "period_type" "text" DEFAULT 'biweekly'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "total_hours" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) DEFAULT 0,
    "staff_count" integer DEFAULT 0,
    "closed_at" timestamp with time zone,
    "closed_by" "uuid",
    "processed_at" timestamp with time zone,
    "processed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_payroll_periods_period_type_check" CHECK (("period_type" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "staff_payroll_periods_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'processing'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."staff_payroll_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_payroll_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payroll_period_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "total_hours" numeric(10,2) DEFAULT 0 NOT NULL,
    "hourly_rate" numeric(10,2) NOT NULL,
    "base_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "bonuses" numeric(10,2) DEFAULT 0,
    "deductions" numeric(10,2) DEFAULT 0,
    "final_amount" numeric(10,2) GENERATED ALWAYS AS ((("base_amount" + "bonuses") - "deductions")) STORED,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "amount_paid" numeric(10,2) DEFAULT 0,
    "amount_owed" numeric(10,2) GENERATED ALWAYS AS (((("base_amount" + "bonuses") - "deductions") - "amount_paid")) STORED,
    "notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_payroll_settlements_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."staff_payroll_settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hourly_rate" numeric(10,2) DEFAULT 0,
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "color" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_profiles_hourly_rate_check" CHECK (("hourly_rate" >= (0)::numeric))
);


ALTER TABLE "public"."staff_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "day_of_week" integer,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_shifts_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."staff_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_work_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "total_hours" numeric(10,2) GENERATED ALWAYS AS ((EXTRACT(epoch FROM ("end_time" - "start_time")) / (3600)::numeric)) STORED,
    "hourly_rate" numeric(10,2) NOT NULL,
    "calculated_amount" numeric(10,2) GENERATED ALWAYS AS (((EXTRACT(epoch FROM ("end_time" - "start_time")) / (3600)::numeric) * "hourly_rate")) STORED,
    "log_type" "text" DEFAULT 'auto'::"text",
    "notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "settled_at" timestamp with time zone,
    CONSTRAINT "staff_work_logs_log_type_check" CHECK (("log_type" = ANY (ARRAY['auto'::"text", 'manual'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."staff_work_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."staff_work_logs"."settled_at" IS 'Timestamp when these work hours were settled/liquidated. NULL means unpaid/pending.';



CREATE TABLE IF NOT EXISTS "public"."storage_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "total_bytes" bigint DEFAULT 0,
    "file_count" integer DEFAULT 0,
    "last_calculated_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."storage_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."storage_usage" IS 'Cached storage usage per organization';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "frequency" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "next_billing_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "invoice_id" "uuid",
    "deleted_at" timestamp with time zone,
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "subscriptions_frequency_check" CHECK (("frequency" = ANY (ARRAY['one-time'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "subscriptions_service_type_check" CHECK (("service_type" = ANY (ARRAY['marketing'::"text", 'ads'::"text", 'crm'::"text", 'hosting'::"text", 'other'::"text", 'marketing_ads'::"text", 'branding'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text",
    "target_audience" "text" DEFAULT 'all'::"text",
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "system_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "system_alerts_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'admins_only'::"text"])))
);


ALTER TABLE "public"."system_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "has_client_portal_view" boolean DEFAULT false,
    "portal_tab_label" "text",
    "portal_icon_key" "text",
    "dependencies" "jsonb" DEFAULT '[]'::"jsonb",
    "conflicts_with" "text"[] DEFAULT ARRAY[]::"text"[],
    "compatible_verticals" "text"[] DEFAULT ARRAY['*'::"text"],
    "icon" "text" DEFAULT 'Box'::"text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "version" "text" DEFAULT '1.0.0'::"text",
    "is_core" boolean DEFAULT false,
    "requires_configuration" boolean DEFAULT false,
    "is_premium" boolean DEFAULT false,
    "price_monthly" numeric(10,2) DEFAULT 0,
    "display_order" integer DEFAULT 0,
    "price" numeric(10,2) DEFAULT 0.00,
    "currency" "text" DEFAULT 'USD'::"text",
    "is_addon" boolean DEFAULT false,
    "parent_module_key" "text",
    "benefits" "jsonb" DEFAULT '[]'::"jsonb",
    "icon_name" "text",
    "visual_metadata" "jsonb" DEFAULT '{"x": 0, "y": 0}'::"jsonb"
);


ALTER TABLE "public"."system_modules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."system_modules"."category" IS 'Module category: core, vertical_specific, add_on, premium';



COMMENT ON COLUMN "public"."system_modules"."dependencies" IS 'Array of dependency objects with module_key, type (required/recommended), and reason';



COMMENT ON COLUMN "public"."system_modules"."conflicts_with" IS 'Array of module keys that conflict with this module';



COMMENT ON COLUMN "public"."system_modules"."compatible_verticals" IS 'Array of vertical slugs, or [*] for all';



COMMENT ON COLUMN "public"."system_modules"."is_core" IS 'Core modules are always active and cannot be disabled';



CREATE TABLE IF NOT EXISTS "public"."system_modules_registry" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "dependencies" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_modules_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_counters" (
    "organization_id" "uuid" NOT NULL,
    "engine" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period" "text" NOT NULL,
    "used" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "usage_counters_period_check" CHECK (("period" = ANY (ARRAY['day'::"text", 'month'::"text", 'hour'::"text", 'minute'::"text"])))
);


ALTER TABLE "public"."usage_counters" OWNER TO "postgres";


COMMENT ON TABLE "public"."usage_counters" IS 'Tracks actual usage per organization per period';



CREATE TABLE IF NOT EXISTS "public"."usage_limits" (
    "organization_id" "uuid" NOT NULL,
    "engine" "text" NOT NULL,
    "period" "text" NOT NULL,
    "limit_value" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "usage_limits_period_check" CHECK (("period" = ANY (ARRAY['day'::"text", 'month'::"text", 'year'::"text", 'unlimited'::"text"])))
);


ALTER TABLE "public"."usage_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."usage_limits" IS 'Applied limits per organization (provisioned from plan)';



CREATE OR REPLACE VIEW "public"."system_usage_alerts" WITH ("security_invoker"='true') AS
 SELECT "l"."organization_id",
    "org"."name" AS "organization_name",
    "org"."parent_organization_id",
    "l"."engine",
    "l"."period",
    "l"."limit_value",
    COALESCE("c"."used", 0) AS "used_value",
    "round"((((COALESCE("c"."used", 0))::numeric / ("l"."limit_value")::numeric) * (100)::numeric), 2) AS "usage_percentage",
        CASE
            WHEN (COALESCE("c"."used", 0) >= "l"."limit_value") THEN 'critical_overage'::"text"
            WHEN ((COALESCE("c"."used", 0))::numeric >= (("l"."limit_value")::numeric * 0.9)) THEN 'critical_warning'::"text"
            WHEN ((COALESCE("c"."used", 0))::numeric >= (("l"."limit_value")::numeric * 0.8)) THEN 'warning'::"text"
            ELSE 'normal'::"text"
        END AS "alert_level"
   FROM (("public"."usage_limits" "l"
     JOIN "public"."organizations" "org" ON (("l"."organization_id" = "org"."id")))
     LEFT JOIN "public"."usage_counters" "c" ON ((("c"."organization_id" = "l"."organization_id") AND ("c"."engine" = "l"."engine") AND ("c"."period" = "l"."period") AND ("c"."period_start" =
        CASE
            WHEN ("l"."period" = 'day'::"text") THEN CURRENT_DATE
            WHEN ("l"."period" = 'month'::"text") THEN ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date"
            ELSE NULL::"date"
        END))))
  WHERE ((COALESCE("c"."used", 0))::numeric >= (("l"."limit_value")::numeric * 0.8));


ALTER VIEW "public"."system_usage_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_passkeys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "text" NOT NULL,
    "credential_public_key" "bytea" NOT NULL,
    "counter" bigint DEFAULT 0 NOT NULL,
    "device_name" "text",
    "device_type" "text",
    "transports" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone,
    CONSTRAINT "user_passkeys_device_type_check" CHECK (("device_type" = ANY (ARRAY['platform'::"text", 'cross-platform'::"text"])))
);


ALTER TABLE "public"."user_passkeys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "notifications" "jsonb" DEFAULT '{"push_enabled": false, "sound_volume": 0.5, "sound_enabled": true, "sound_selection": "subtle", "channel_overrides": {}, "desktop_notifications": false}'::"jsonb",
    "behavior" "jsonb" DEFAULT '{"auto_advance": false, "default_view": "all", "send_on_enter": true}'::"jsonb",
    "shortcuts" "jsonb" DEFAULT '{}'::"jsonb",
    "theme" "jsonb" DEFAULT '{"mode": "system", "density": "comfortable"}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_clients" AS
 SELECT "id",
    "created_at",
    "user_id",
    "organization_id",
    "name",
    "company_name",
    "nit",
    "email",
    "phone",
    "address",
    "logo_url",
    "facebook",
    "instagram",
    "tiktok",
    "website",
    "notes",
    "status",
    "metadata",
    "portal_token",
    "portal_short_token",
    "portal_token_expires_at",
    "portal_token_never_expires",
    "portal_config",
    "deleted_at",
    "contact_type",
    "avatar_url"
   FROM "public"."leads"
  WHERE (("contact_type" = 'client'::"text") AND ("deleted_at" IS NULL));


ALTER VIEW "public"."v_clients" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_clients" IS 'Backward-compatible view of clients. Reads from leads table filtered by contact_type=client. Use for gradual migration of legacy code.';



CREATE OR REPLACE VIEW "public"."v_organization_templates" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "organization_id",
    "o"."name" AS "organization_name",
    "o"."slug" AS "organization_slug",
    "a"."id" AS "template_id",
    "a"."name" AS "template_name",
    "a"."slug" AS "template_slug",
    "a"."category" AS "template_category",
    "a"."price_monthly" AS "template_price",
    "o"."app_activated_at",
    COALESCE("jsonb_array_length"("o"."manual_module_overrides"), 0) AS "active_module_count"
   FROM ("public"."organizations" "o"
     LEFT JOIN "public"."saas_apps" "a" ON (("a"."id" = "o"."active_app_id")))
  WHERE ("o"."active_app_id" IS NOT NULL);


ALTER VIEW "public"."v_organization_templates" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_organization_templates" IS 'Shows which organizations are using which solution templates';



CREATE OR REPLACE VIEW "public"."v_template_modules" WITH ("security_invoker"='true') AS
 SELECT DISTINCT "a"."id" AS "template_id",
    "a"."name" AS "template_name",
    "a"."slug" AS "template_slug",
    "a"."recommended_for_verticals",
    "am"."module_key",
    "sm"."name" AS "module_name",
    "sm"."description" AS "module_description",
    "sm"."category" AS "module_category",
    "sm"."is_core",
    "sm"."icon",
    "sm"."color"
   FROM (("public"."saas_apps" "a"
     JOIN "public"."saas_app_modules" "am" ON (("am"."app_id" = "a"."id")))
     LEFT JOIN "public"."system_modules" "sm" ON (("sm"."key" = "am"."module_key")))
  WHERE ("a"."is_active" = true);


ALTER VIEW "public"."v_template_modules" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_template_modules" IS 'Shows which modules are included in each solution template';



CREATE TABLE IF NOT EXISTS "public"."vertical_modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vertical_key" "text" NOT NULL,
    "module_key" "text" NOT NULL,
    "is_core" boolean DEFAULT false,
    "is_default_enabled" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vertical_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verticals" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verticals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "service_id" "uuid",
    "assigned_staff_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "location_type" "text" DEFAULT 'at_client_address'::"text",
    "location_address" "text",
    "vertical" "text" DEFAULT 'generic'::"text" NOT NULL,
    "price_quoted" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_executions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "current_step_id" character varying(255),
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."workflow_executions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "node_id" character varying(255),
    "level" character varying(20) DEFAULT 'info'::character varying,
    "message" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_pending_inputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "node_id" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "input_type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "response" "jsonb",
    "timeout_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "workflow_pending_inputs_input_type_check" CHECK (("input_type" = ANY (ARRAY['button_click'::"text", 'text'::"text", 'any'::"text", 'image'::"text", 'location'::"text", 'audio'::"text"]))),
    CONSTRAINT "workflow_pending_inputs_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'completed'::"text", 'timeout'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."workflow_pending_inputs" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_pending_inputs" IS 'Stores pending user input state for workflow wait nodes';



COMMENT ON COLUMN "public"."workflow_pending_inputs"."config" IS 'WaitInputNodeData configuration including validation rules and branches';



COMMENT ON COLUMN "public"."workflow_pending_inputs"."response" IS 'The actual user response when received';



CREATE TABLE IF NOT EXISTS "public"."workflow_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."workflow_role" DEFAULT 'viewer'::"public"."workflow_role" NOT NULL,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "definition" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "name" "text",
    "is_published" boolean DEFAULT false
);


ALTER TABLE "public"."workflow_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT false,
    "trigger_type" character varying(50) NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb",
    "definition" "jsonb" DEFAULT '{"edges": [], "nodes": []}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_run_at" timestamp with time zone
);


ALTER TABLE "public"."workflows" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_new_pkey" PRIMARY KEY ("organization_id", "agent_id");



ALTER TABLE ONLY "public"."agent_channels"
    ADD CONSTRAINT "agent_channels_pkey" PRIMARY KEY ("organization_id", "agent_id", "channel_type");



ALTER TABLE ONLY "public"."agent_presence"
    ADD CONSTRAINT "agent_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."agent_qa_reports"
    ADD CONSTRAINT "agent_qa_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_new_pkey" PRIMARY KEY ("organization_id", "agent_id", "skill");



ALTER TABLE ONLY "public"."agent_status_history"
    ADD CONSTRAINT "agent_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_cache"
    ADD CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_credentials"
    ADD CONSTRAINT "ai_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_image_generation_logs"
    ADD CONSTRAINT "ai_image_generation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_providers"
    ADD CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_settings"
    ADD CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_history"
    ADD CONSTRAINT "assignment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_logs"
    ADD CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_shifts"
    ADD CONSTRAINT "attendance_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_shifts"
    ADD CONSTRAINT "attendance_shifts_staff_id_date_key" UNIQUE ("staff_id", "date");



ALTER TABLE ONLY "public"."automation_queue"
    ADD CONSTRAINT "automation_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billable_events"
    ADD CONSTRAINT "billable_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_audit_log"
    ADD CONSTRAINT "billing_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_cycles"
    ADD CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_overage_rates"
    ADD CONSTRAINT "billing_overage_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_packages"
    ADD CONSTRAINT "billing_packages_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."billing_packages"
    ADD CONSTRAINT "billing_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branding_tiers"
    ADD CONSTRAINT "branding_tiers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."branding_tiers"
    ADD CONSTRAINT "branding_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_fields"
    ADD CONSTRAINT "briefing_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_responses"
    ADD CONSTRAINT "briefing_responses_briefing_id_field_id_key" UNIQUE ("briefing_id", "field_id");



ALTER TABLE ONLY "public"."briefing_responses"
    ADD CONSTRAINT "briefing_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_steps"
    ADD CONSTRAINT "briefing_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_templates"
    ADD CONSTRAINT "briefing_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_templates"
    ADD CONSTRAINT "briefing_templates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_definitions"
    ADD CONSTRAINT "channel_definitions_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_provider_id_unique" UNIQUE ("organization_id", "provider", "provider_channel_id");



ALTER TABLE ONLY "public"."client_categories"
    ADD CONSTRAINT "client_categories_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."client_categories"
    ADD CONSTRAINT "client_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_events"
    ADD CONSTRAINT "client_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_portal_short_token_key" UNIQUE ("portal_short_token");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_intents"
    ADD CONSTRAINT "conversation_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_lead_tags"
    ADD CONSTRAINT "crm_lead_tags_pkey" PRIMARY KEY ("lead_id", "tag_id");



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_snapshots"
    ADD CONSTRAINT "data_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deal_carts"
    ADD CONSTRAINT "deal_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dian_documents"
    ADD CONSTRAINT "dian_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domain_events"
    ADD CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emitters"
    ADD CONSTRAINT "emitters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_organization_id_module_key_feature_key_key" UNIQUE ("organization_id", "module_key", "feature_key");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_dashboard_banners"
    ADD CONSTRAINT "global_dashboard_banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_dashboard_banners"
    ADD CONSTRAINT "global_dashboard_banners_space_type_key" UNIQUE ("space_type");



ALTER TABLE ONLY "public"."hosting_accounts"
    ADD CONSTRAINT "hosting_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_connections"
    ADD CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_providers"
    ADD CONSTRAINT "integration_providers_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."integration_providers"
    ADD CONSTRAINT "integration_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intent_routing_rules"
    ADD CONSTRAINT "intent_routing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_portal_short_token_key" UNIQUE ("portal_short_token");



ALTER TABLE ONLY "public"."lifecycle_notifications"
    ADD CONSTRAINT "lifecycle_notifications_organization_id_notification_type_key" UNIQUE ("organization_id", "notification_type");



ALTER TABLE ONLY "public"."lifecycle_notifications"
    ADD CONSTRAINT "lifecycle_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manifest_documents"
    ADD CONSTRAINT "manifest_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manifest_imeis"
    ADD CONSTRAINT "manifest_imeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_audiences"
    ADD CONSTRAINT "marketing_audiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_sequences"
    ADD CONSTRAINT "marketing_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_steps"
    ADD CONSTRAINT "marketing_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_reaction_key" UNIQUE ("message_id", "user_id", "reaction");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_external_id_unique" UNIQUE ("external_id");



COMMENT ON CONSTRAINT "messages_external_id_unique" ON "public"."messages" IS 'Prevents duplicate message insertion from external providers like Meta';



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['sending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text", 'received'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."messaging_templates"
    ADD CONSTRAINT "messaging_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meta_ads_metrics"
    ADD CONSTRAINT "meta_ads_metrics_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."meta_ads_metrics"
    ADD CONSTRAINT "meta_ads_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meta_org_ads_metrics"
    ADD CONSTRAINT "meta_org_ads_metrics_organization_id_snapshot_date_key" UNIQUE ("organization_id", "snapshot_date");



ALTER TABLE ONLY "public"."meta_org_ads_metrics"
    ADD CONSTRAINT "meta_org_ads_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meta_social_metrics"
    ADD CONSTRAINT "meta_social_metrics_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."meta_social_metrics"
    ADD CONSTRAINT "meta_social_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_add_ons"
    ADD CONSTRAINT "organization_add_ons_organization_id_add_on_type_key" UNIQUE ("organization_id", "add_on_type");



ALTER TABLE ONLY "public"."organization_add_ons"
    ADD CONSTRAINT "organization_add_ons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_audit_log"
    ADD CONSTRAINT "organization_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_billing_profiles"
    ADD CONSTRAINT "organization_billing_profiles_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organization_locations"
    ADD CONSTRAINT "organization_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_organization_id_module_key_key" UNIQUE ("organization_id", "module_key");



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_payment_methods"
    ADD CONSTRAINT "organization_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_roles"
    ADD CONSTRAINT "organization_roles_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."organization_roles"
    ADD CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_saas_products"
    ADD CONSTRAINT "organization_saas_products_pkey" PRIMARY KEY ("organization_id", "product_id");



ALTER TABLE ONLY "public"."organization_sequences"
    ADD CONSTRAINT "organization_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_smtp_configs"
    ADD CONSTRAINT "organization_smtp_configs_org_unique" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_smtp_configs"
    ADD CONSTRAINT "organization_smtp_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."passkey_challenges"
    ADD CONSTRAINT "passkey_challenges_challenge_key" UNIQUE ("challenge");



ALTER TABLE ONLY "public"."passkey_challenges"
    ADD CONSTRAINT "passkey_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_accounts"
    ADD CONSTRAINT "payment_accounts_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."payment_accounts"
    ADD CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_accounts"
    ADD CONSTRAINT "payment_accounts_stripe_account_id_key" UNIQUE ("stripe_account_id");



ALTER TABLE ONLY "public"."payment_config_audit"
    ADD CONSTRAINT "payment_config_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_gateway_config"
    ADD CONSTRAINT "payment_gateway_config_gateway_name_key" UNIQUE ("gateway_name");



ALTER TABLE ONLY "public"."payment_gateway_config"
    ADD CONSTRAINT "payment_gateway_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."pipeline_process_map"
    ADD CONSTRAINT "pipeline_process_map_pipeline_stage_id_process_type_key" UNIQUE ("pipeline_stage_id", "process_type");



ALTER TABLE ONLY "public"."pipeline_process_map"
    ADD CONSTRAINT "pipeline_process_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_organization_id_status_key_key" UNIQUE ("organization_id", "status_key");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_limit_definitions"
    ADD CONSTRAINT "plan_limit_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_limit_definitions"
    ADD CONSTRAINT "plan_limit_definitions_plan_id_engine_period_key" UNIQUE ("plan_id", "engine", "period");



ALTER TABLE ONLY "public"."plan_templates"
    ADD CONSTRAINT "plan_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_templates"
    ADD CONSTRAINT "plan_templates_plan_code_key" UNIQUE ("plan_code");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_access_logs"
    ADD CONSTRAINT "portal_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_instances"
    ADD CONSTRAINT "process_instances_lead_id_type_key" UNIQUE ("lead_id", "type");



ALTER TABLE ONLY "public"."process_instances"
    ADD CONSTRAINT "process_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_states"
    ADD CONSTRAINT "process_states_organization_id_type_key_key" UNIQUE ("organization_id", "type", "key");



ALTER TABLE ONLY "public"."process_states"
    ADD CONSTRAINT "process_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_replies"
    ADD CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_settings"
    ADD CONSTRAINT "quote_settings_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reseller_activity_log"
    ADD CONSTRAINT "reseller_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resto_table_sessions"
    ADD CONSTRAINT "resto_table_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "resto_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "resto_tables_qr_token_key" UNIQUE ("qr_token");



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "resto_tables_zone_id_table_identifier_key" UNIQUE ("zone_id", "table_identifier");



ALTER TABLE ONLY "public"."resto_zones"
    ADD CONSTRAINT "resto_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_share_rules"
    ADD CONSTRAINT "revenue_share_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_app_add_ons"
    ADD CONSTRAINT "saas_app_add_ons_app_id_add_on_type_tier_id_key" UNIQUE ("app_id", "add_on_type", "tier_id");



ALTER TABLE ONLY "public"."saas_app_add_ons"
    ADD CONSTRAINT "saas_app_add_ons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_app_modules"
    ADD CONSTRAINT "saas_app_modules_app_id_module_key_key" UNIQUE ("app_id", "module_key");



ALTER TABLE ONLY "public"."saas_app_modules"
    ADD CONSTRAINT "saas_app_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_apps"
    ADD CONSTRAINT "saas_apps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_apps_portal_config"
    ADD CONSTRAINT "saas_apps_portal_config_app_id_module_slug_key" UNIQUE ("app_id", "module_slug");



ALTER TABLE ONLY "public"."saas_apps_portal_config"
    ADD CONSTRAINT "saas_apps_portal_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_apps"
    ADD CONSTRAINT "saas_apps_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."saas_platform_invoices"
    ADD CONSTRAINT "saas_platform_invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."saas_platform_invoices"
    ADD CONSTRAINT "saas_platform_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_product_modules"
    ADD CONSTRAINT "saas_product_modules_pkey" PRIMARY KEY ("product_id", "module_id");



ALTER TABLE ONLY "public"."saas_product_packages"
    ADD CONSTRAINT "saas_product_packages_pkey" PRIMARY KEY ("product_id", "package_id");



ALTER TABLE ONLY "public"."saas_products"
    ADD CONSTRAINT "saas_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_products"
    ADD CONSTRAINT "saas_products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "saas_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_replies"
    ADD CONSTRAINT "saved_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_workflow_jobs"
    ADD CONSTRAINT "scheduled_workflow_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sentiment_alerts"
    ADD CONSTRAINT "sentiment_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_organization_id_slug_key" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_payments"
    ADD CONSTRAINT "staff_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_payroll_periods"
    ADD CONSTRAINT "staff_payroll_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_payroll_settlements"
    ADD CONSTRAINT "staff_payroll_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_member_id_key" UNIQUE ("member_id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_work_logs"
    ADD CONSTRAINT "staff_work_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_modules"
    ADD CONSTRAINT "system_modules_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_modules"
    ADD CONSTRAINT "system_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_modules_registry"
    ADD CONSTRAINT "system_modules_registry_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "unique_active_subscription" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."meta_ads_metrics"
    ADD CONSTRAINT "unique_ads_daily_snapshot" UNIQUE ("client_id", "snapshot_date");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "unique_client_platform" UNIQUE ("client_id", "platform");



ALTER TABLE ONLY "public"."organization_sequences"
    ADD CONSTRAINT "unique_org_entity" UNIQUE ("organization_id", "entity_type");



ALTER TABLE ONLY "public"."staff_payroll_periods"
    ADD CONSTRAINT "unique_org_period" UNIQUE ("organization_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "unique_org_settings_id" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."ai_credentials"
    ADD CONSTRAINT "unique_prio_per_org_provider" UNIQUE ("organization_id", "provider_id", "priority");



ALTER TABLE ONLY "public"."meta_social_metrics"
    ADD CONSTRAINT "unique_social_daily_snapshot" UNIQUE ("client_id", "snapshot_date");



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "unique_staff_day_shift" UNIQUE ("staff_id", "day_of_week", "start_time");



ALTER TABLE ONLY "public"."staff_payroll_settlements"
    ADD CONSTRAINT "unique_staff_period" UNIQUE ("payroll_period_id", "staff_id");



ALTER TABLE ONLY "public"."user_passkeys"
    ADD CONSTRAINT "unique_user_credential" UNIQUE ("user_id", "credential_id");



ALTER TABLE ONLY "public"."deal_carts"
    ADD CONSTRAINT "uq_deal_carts_lead" UNIQUE ("lead_id");



ALTER TABLE ONLY "public"."usage_counters"
    ADD CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("organization_id", "engine", "period_start", "period");



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("organization_id", "engine", "period");



ALTER TABLE ONLY "public"."user_passkeys"
    ADD CONSTRAINT "user_passkeys_credential_id_key" UNIQUE ("credential_id");



ALTER TABLE ONLY "public"."user_passkeys"
    ADD CONSTRAINT "user_passkeys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."vertical_modules"
    ADD CONSTRAINT "vertical_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vertical_modules"
    ADD CONSTRAINT "vertical_modules_vertical_key_module_key_key" UNIQUE ("vertical_key", "module_key");



ALTER TABLE ONLY "public"."verticals"
    ADD CONSTRAINT "verticals_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_logs"
    ADD CONSTRAINT "workflow_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_pending_inputs"
    ADD CONSTRAINT "workflow_pending_inputs_execution_id_node_id_key" UNIQUE ("execution_id", "node_id");



ALTER TABLE ONLY "public"."workflow_pending_inputs"
    ADD CONSTRAINT "workflow_pending_inputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_workflow_id_user_id_key" UNIQUE ("workflow_id", "user_id");



ALTER TABLE ONLY "public"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_pkey" PRIMARY KEY ("id");



CREATE INDEX "billing_cycles_invoice_id_idx" ON "public"."billing_cycles" USING "btree" ("invoice_id");



CREATE INDEX "billing_cycles_service_id_idx" ON "public"."billing_cycles" USING "btree" ("service_id");



CREATE INDEX "billing_cycles_status_idx" ON "public"."billing_cycles" USING "btree" ("status");



CREATE INDEX "briefings_service_id_idx" ON "public"."briefings" USING "btree" ("service_id");



CREATE INDEX "idx_agent_availability_status" ON "public"."agent_availability" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_agent_channels_lookup" ON "public"."agent_channels" USING "btree" ("organization_id", "channel_type");



CREATE INDEX "idx_agent_qa_reports_lookup" ON "public"."agent_qa_reports" USING "btree" ("organization_id", "agent_id", "created_at" DESC);



CREATE INDEX "idx_agent_skills_lookup" ON "public"."agent_skills" USING "btree" ("organization_id", "skill");



CREATE INDEX "idx_agent_status_history_agent_date" ON "public"."agent_status_history" USING "btree" ("agent_id", "started_at" DESC);



CREATE INDEX "idx_agent_status_history_org" ON "public"."agent_status_history" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_cache_expiry" ON "public"."ai_cache" USING "btree" ("expires_at");



CREATE UNIQUE INDEX "idx_ai_cache_lookup" ON "public"."ai_cache" USING "btree" ("organization_id", "task_type", "payload_hash");



CREATE INDEX "idx_ai_suggestions_conversation" ON "public"."ai_suggestions" USING "btree" ("conversation_id");



CREATE INDEX "idx_ai_suggestions_created" ON "public"."ai_suggestions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_suggestions_message" ON "public"."ai_suggestions" USING "btree" ("message_id");



CREATE INDEX "idx_analytics_daily_usage_org_date" ON "public"."analytics_daily_usage" USING "btree" ("organization_id", "usage_date");



CREATE INDEX "idx_assign_hist_conv" ON "public"."assignment_history" USING "btree" ("conversation_id");



CREATE INDEX "idx_assign_rules_org" ON "public"."assignment_rules" USING "btree" ("organization_id");



CREATE INDEX "idx_attendance_logs_org_date" ON "public"."attendance_logs" USING "btree" ("organization_id", "timestamp");



CREATE INDEX "idx_attendance_logs_staff" ON "public"."attendance_logs" USING "btree" ("staff_id");



CREATE INDEX "idx_attendance_shifts_staff_date" ON "public"."attendance_shifts" USING "btree" ("staff_id", "date");



CREATE INDEX "idx_audit_action" ON "public"."security_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_actor" ON "public"."security_audit_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_document_id" ON "public"."billing_audit_log" USING "btree" ("document_id");



CREATE INDEX "idx_audit_log_org_id" ON "public"."organization_audit_log" USING "btree" ("organization_id");



CREATE INDEX "idx_audit_logs_org_created" ON "public"."organization_audit_log" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_audit_org_created" ON "public"."security_audit_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_audit_organization" ON "public"."billing_audit_log" USING "btree" ("organization_id");



CREATE INDEX "idx_audit_timestamp" ON "public"."billing_audit_log" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_audit_user" ON "public"."billing_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_automation_queue_execution" ON "public"."automation_queue" USING "btree" ("execution_id");



CREATE INDEX "idx_automation_queue_poll" ON "public"."automation_queue" USING "btree" ("status", "resume_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_be_date" ON "public"."billable_events" USING "btree" ("event_date");



CREATE INDEX "idx_be_org" ON "public"."billable_events" USING "btree" ("organization_id");



CREATE INDEX "idx_be_settlement" ON "public"."billable_events" USING "btree" ("settled", "settlement_id");



CREATE INDEX "idx_be_type" ON "public"."billable_events" USING "btree" ("event_type");



CREATE INDEX "idx_billable_events_deleted" ON "public"."billable_events" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_branding_tiers_capabilities" ON "public"."branding_tiers" USING "gin" ("capabilities");



CREATE INDEX "idx_briefing_fields_step" ON "public"."briefing_fields" USING "btree" ("step_id");



CREATE INDEX "idx_briefing_responses_briefing" ON "public"."briefing_responses" USING "btree" ("briefing_id");



CREATE INDEX "idx_briefing_responses_briefing_id" ON "public"."briefing_responses" USING "btree" ("briefing_id");



CREATE INDEX "idx_briefing_steps_template" ON "public"."briefing_steps" USING "btree" ("template_id");



CREATE INDEX "idx_briefing_templates_org_id" ON "public"."briefing_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_briefing_templates_organization_id" ON "public"."briefing_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_briefings_client" ON "public"."briefings" USING "btree" ("client_id");



CREATE INDEX "idx_briefings_deleted_at" ON "public"."briefings" USING "btree" ("deleted_at");



CREATE INDEX "idx_briefings_org_id" ON "public"."briefings" USING "btree" ("organization_id");



CREATE INDEX "idx_briefings_organization_id" ON "public"."briefings" USING "btree" ("organization_id");



CREATE INDEX "idx_briefings_token" ON "public"."briefings" USING "btree" ("token");



CREATE INDEX "idx_broadcast_recipients_broadcast" ON "public"."broadcast_recipients" USING "btree" ("broadcast_id");



CREATE INDEX "idx_broadcast_recipients_lead" ON "public"."broadcast_recipients" USING "btree" ("lead_id");



CREATE INDEX "idx_broadcast_recipients_status" ON "public"."broadcast_recipients" USING "btree" ("status");



CREATE INDEX "idx_broadcasts_organization" ON "public"."broadcasts" USING "btree" ("organization_id");



CREATE INDEX "idx_broadcasts_status" ON "public"."broadcasts" USING "btree" ("status");



CREATE INDEX "idx_campaigns_org" ON "public"."marketing_campaigns" USING "btree" ("organization_id");



CREATE INDEX "idx_campaigns_scheduled" ON "public"."marketing_campaigns" USING "btree" ("scheduled_for") WHERE (("scheduled_for" IS NOT NULL) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_cart_items_cart" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE INDEX "idx_client_events_client_id" ON "public"."client_events" USING "btree" ("client_id");



CREATE INDEX "idx_client_events_created_at" ON "public"."client_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_clients_deleted" ON "public"."clients" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_clients_deleted_at" ON "public"."clients" USING "btree" ("deleted_at");



CREATE INDEX "idx_clients_org" ON "public"."clients" USING "btree" ("organization_id");



CREATE INDEX "idx_clients_org_deleted" ON "public"."clients" USING "btree" ("organization_id", "deleted_at");



CREATE INDEX "idx_clients_org_id" ON "public"."clients" USING "btree" ("organization_id");



COMMENT ON INDEX "public"."idx_clients_org_id" IS 'Speeds up dashboard client counts';



CREATE INDEX "idx_clients_organization_id" ON "public"."clients" USING "btree" ("organization_id");



CREATE INDEX "idx_clients_portal_short_token" ON "public"."clients" USING "btree" ("portal_short_token");



CREATE UNIQUE INDEX "idx_clients_portal_token" ON "public"."clients" USING "btree" ("portal_token");



CREATE INDEX "idx_connections_provider" ON "public"."integration_connections" USING "btree" ("provider_id");



CREATE INDEX "idx_contracts_client" ON "public"."contracts" USING "btree" ("client_id");



CREATE INDEX "idx_contracts_org" ON "public"."contracts" USING "btree" ("organization_id");



CREATE INDEX "idx_contracts_status" ON "public"."contracts" USING "btree" ("status");



CREATE INDEX "idx_conversations_assigned" ON "public"."conversations" USING "btree" ("assigned_to");



CREATE INDEX "idx_conversations_client" ON "public"."conversations" USING "btree" ("client_id");



CREATE INDEX "idx_conversations_client_id" ON "public"."conversations" USING "btree" ("client_id");



CREATE INDEX "idx_conversations_connection" ON "public"."conversations" USING "btree" ("connection_id") WHERE ("connection_id" IS NOT NULL);



CREATE INDEX "idx_conversations_connection_id" ON "public"."conversations" USING "btree" ("connection_id");



CREATE INDEX "idx_conversations_last_direction" ON "public"."conversations" USING "btree" ((("metadata" ->> 'last_message_direction'::"text")));



CREATE INDEX "idx_conversations_last_msg" ON "public"."conversations" USING "btree" ("organization_id", "last_message_at" DESC);



CREATE INDEX "idx_conversations_lead" ON "public"."conversations" USING "btree" ("lead_id");



CREATE INDEX "idx_conversations_lookup" ON "public"."conversations" USING "btree" ("channel", "lead_id");



CREATE INDEX "idx_conversations_monitoring_assigned" ON "public"."conversations" USING "btree" ("organization_id", "assigned_to", "status", "state") WHERE (("assigned_to" IS NOT NULL) AND ("status" = 'open'::"text"));



CREATE INDEX "idx_conversations_monitoring_unassigned" ON "public"."conversations" USING "btree" ("organization_id", "assigned_to", "status", "state") WHERE (("assigned_to" IS NULL) AND ("status" = 'open'::"text"));



CREATE INDEX "idx_conversations_org" ON "public"."conversations" USING "btree" ("organization_id");



CREATE INDEX "idx_conversations_org_last_message" ON "public"."conversations" USING "btree" ("organization_id", "last_message_at" DESC);



CREATE INDEX "idx_conversations_org_lastmsg" ON "public"."conversations" USING "btree" ("organization_id", "last_message_at" DESC);



CREATE INDEX "idx_conversations_phone" ON "public"."conversations" USING "btree" ("phone");



CREATE INDEX "idx_conversations_priority" ON "public"."conversations" USING "btree" ("priority");



CREATE INDEX "idx_conversations_search" ON "public"."conversations" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("last_message", ''::"text")));



CREATE INDEX "idx_conversations_sentiment" ON "public"."conversations" USING "btree" ("overall_sentiment");



CREATE INDEX "idx_conversations_state" ON "public"."conversations" USING "btree" ("state");



CREATE INDEX "idx_conversations_status" ON "public"."conversations" USING "btree" ("status");



CREATE INDEX "idx_conversations_tags" ON "public"."conversations" USING "gin" ("tags");



CREATE INDEX "idx_conversations_updated" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_crm_lead_tags_lead" ON "public"."crm_lead_tags" USING "btree" ("lead_id");



CREATE INDEX "idx_crm_tags_org" ON "public"."crm_tags" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_tasks_org" ON "public"."crm_tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_deal_carts_lead" ON "public"."deal_carts" USING "btree" ("lead_id");



CREATE INDEX "idx_deal_carts_org" ON "public"."deal_carts" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_dian_documents_cufe" ON "public"."dian_documents" USING "btree" ("cufe") WHERE ("cufe" IS NOT NULL);



CREATE INDEX "idx_dian_documents_invoice_id" ON "public"."dian_documents" USING "btree" ("invoice_id");



CREATE INDEX "idx_dian_documents_org_id" ON "public"."dian_documents" USING "btree" ("organization_id");



CREATE INDEX "idx_domain_events_created_at" ON "public"."domain_events" USING "btree" ("created_at");



CREATE INDEX "idx_domain_events_entity" ON "public"."domain_events" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_email_campaigns_org" ON "public"."email_campaigns" USING "btree" ("organization_id");



CREATE INDEX "idx_email_templates_org" ON "public"."email_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_emitters_organization_id" ON "public"."emitters" USING "btree" ("organization_id");



CREATE INDEX "idx_enrollments_active_org" ON "public"."marketing_enrollments" USING "btree" ("organization_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_enrollments_campaign" ON "public"."marketing_enrollments" USING "btree" ("campaign_id");



CREATE INDEX "idx_enrollments_contact" ON "public"."marketing_enrollments" USING "btree" ("contact_id");



CREATE INDEX "idx_enrollments_next_run" ON "public"."marketing_enrollments" USING "btree" ("next_run_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_enrollments_status" ON "public"."marketing_enrollments" USING "btree" ("status");



CREATE INDEX "idx_feature_flags_module" ON "public"."feature_flags" USING "btree" ("organization_id", "module_key");



CREATE INDEX "idx_feature_flags_org" ON "public"."feature_flags" USING "btree" ("organization_id");



CREATE INDEX "idx_integration_connections_org_provider" ON "public"."integration_connections" USING "btree" ("organization_id", "provider_key");



CREATE UNIQUE INDEX "idx_integration_connections_primary" ON "public"."integration_connections" USING "btree" ("organization_id", "provider_key") WHERE ("is_primary" = true);



CREATE INDEX "idx_intents_conversation" ON "public"."conversation_intents" USING "btree" ("conversation_id");



CREATE INDEX "idx_intents_intent" ON "public"."conversation_intents" USING "btree" ("intent", "detected_at" DESC);



CREATE INDEX "idx_invoices_billing_cycle_id" ON "public"."invoices" USING "btree" ("billing_cycle_id");



CREATE INDEX "idx_invoices_client" ON "public"."invoices" USING "btree" ("client_id");



CREATE INDEX "idx_invoices_deleted_at" ON "public"."invoices" USING "btree" ("deleted_at");



CREATE INDEX "idx_invoices_org" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_org_deleted" ON "public"."invoices" USING "btree" ("organization_id", "deleted_at");



CREATE INDEX "idx_invoices_org_id" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_org_status" ON "public"."invoices" USING "btree" ("organization_id", "status");



COMMENT ON INDEX "public"."idx_invoices_org_status" IS 'Speeds up dashboard revenue calculations';



CREATE INDEX "idx_invoices_org_total" ON "public"."invoices" USING "btree" ("organization_id", "total", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_invoices_organization_id" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_knowledge_base_audience" ON "public"."knowledge_base" USING "btree" ("audience");



CREATE INDEX "idx_knowledge_base_category" ON "public"."knowledge_base" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_knowledge_base_org" ON "public"."knowledge_base" USING "btree" ("organization_id");



CREATE INDEX "idx_leads_contact_type" ON "public"."leads" USING "btree" ("contact_type");



CREATE INDEX "idx_leads_contact_type_org" ON "public"."leads" USING "btree" ("organization_id", "contact_type");



CREATE INDEX "idx_leads_deleted_at" ON "public"."leads" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_leads_master_contact_id" ON "public"."leads" USING "btree" ("master_contact_id") WHERE ("master_contact_id" IS NOT NULL);



CREATE INDEX "idx_leads_nit" ON "public"."leads" USING "btree" ("nit") WHERE ("nit" IS NOT NULL);



CREATE INDEX "idx_leads_open_created" ON "public"."leads" USING "btree" ("created_at") WHERE (("status" <> 'lost'::"text") AND ("status" <> 'converted'::"text"));



CREATE INDEX "idx_leads_opted_out" ON "public"."leads" USING "btree" ("marketing_opted_out") WHERE ("marketing_opted_out" = true);



CREATE INDEX "idx_leads_org" ON "public"."leads" USING "btree" ("organization_id");



CREATE INDEX "idx_leads_org_score" ON "public"."leads" USING "btree" ("organization_id", "score");



CREATE INDEX "idx_leads_organization" ON "public"."leads" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_leads_portal_short_token" ON "public"."leads" USING "btree" ("portal_short_token") WHERE ("portal_short_token" IS NOT NULL);



CREATE INDEX "idx_leads_portal_token" ON "public"."leads" USING "btree" ("portal_short_token") WHERE ("portal_short_token" IS NOT NULL);



CREATE INDEX "idx_leads_quote" ON "public"."leads" USING "btree" ("quote_id") WHERE ("quote_id" IS NOT NULL);



CREATE INDEX "idx_leads_source_connection" ON "public"."leads" USING "btree" ("source_connection_id") WHERE ("source_connection_id" IS NOT NULL);



CREATE INDEX "idx_leads_status" ON "public"."leads" USING "btree" ("status");



CREATE INDEX "idx_leads_updated_at" ON "public"."leads" USING "btree" ("updated_at");



CREATE INDEX "idx_manifest_imeis_imei" ON "public"."manifest_imeis" USING "btree" ("imei");



CREATE INDEX "idx_manifest_imeis_org" ON "public"."manifest_imeis" USING "btree" ("organization_id");



CREATE INDEX "idx_marketing_enrollments_next_run" ON "public"."marketing_enrollments" USING "btree" ("next_run_at") WHERE ("status" = 'scheduled'::"text");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_created" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_external_id" ON "public"."messages" USING "btree" ("external_id");



CREATE INDEX "idx_messages_history" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_messages_org" ON "public"."messages" USING "btree" ("organization_id");



CREATE INDEX "idx_messages_sentiment" ON "public"."messages" USING "btree" ("sentiment", "created_at" DESC);



CREATE INDEX "idx_messages_sentiment_score" ON "public"."messages" USING "btree" ("sentiment_score");



CREATE INDEX "idx_messaging_templates_channel" ON "public"."messaging_templates" USING "btree" ("channel_id");



CREATE INDEX "idx_messaging_templates_org" ON "public"."messaging_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_meta_ads_client_date" ON "public"."meta_ads_metrics" USING "btree" ("client_id", "snapshot_date");



CREATE INDEX "idx_meta_org_ads_metrics_org_date" ON "public"."meta_org_ads_metrics" USING "btree" ("organization_id", "snapshot_date");



CREATE INDEX "idx_meta_social_client_date" ON "public"."meta_social_metrics" USING "btree" ("client_id", "snapshot_date");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_organization_id" ON "public"."notifications" USING "btree" ("organization_id");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_org_add_ons_organization" ON "public"."organization_add_ons" USING "btree" ("organization_id");



CREATE INDEX "idx_org_add_ons_status" ON "public"."organization_add_ons" USING "btree" ("status");



CREATE INDEX "idx_org_add_ons_type" ON "public"."organization_add_ons" USING "btree" ("add_on_type");



CREATE INDEX "idx_org_deletion_scheduled" ON "public"."organizations" USING "btree" ("deletion_scheduled_at") WHERE ("deletion_scheduled_at" IS NOT NULL);



CREATE INDEX "idx_org_last_activity" ON "public"."organizations" USING "btree" ("last_activity_at");



CREATE INDEX "idx_org_locations_active" ON "public"."organization_locations" USING "btree" ("is_active");



CREATE INDEX "idx_org_locations_org_id" ON "public"."organization_locations" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_deleted" ON "public"."organization_members" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_org_members_id" ON "public"."organization_members" USING "btree" ("id");



CREATE INDEX "idx_org_members_permissions" ON "public"."organization_members" USING "gin" ("permissions");



CREATE INDEX "idx_org_members_role_id" ON "public"."organization_members" USING "btree" ("role_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_org_members_user_org" ON "public"."organization_members" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_org_staff_access_token" ON "public"."organization_staff" USING "btree" ("access_token");



CREATE INDEX "idx_org_staff_org_id" ON "public"."organization_staff" USING "btree" ("organization_id");



CREATE INDEX "idx_org_trial_ends" ON "public"."organizations" USING "btree" ("trial_ends_at") WHERE ("trial_ends_at" IS NOT NULL);



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_organization_members_user_id" IS 'Speeds up sidebar organization switcher';



CREATE INDEX "idx_organization_members_user_org" ON "public"."organization_members" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_organization_settings_organization_id" ON "public"."organization_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_organizations_active_app" ON "public"."organizations" USING "btree" ("active_app_id");



CREATE INDEX "idx_organizations_branding_tier" ON "public"."organizations" USING "btree" ("branding_tier_id");



CREATE INDEX "idx_organizations_capabilities" ON "public"."organizations" USING "gin" ("capabilities");



CREATE INDEX "idx_organizations_created_at" ON "public"."organizations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_organizations_parent_id" ON "public"."organizations" USING "btree" ("parent_organization_id") WHERE ("parent_organization_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_organizations_parent_id" IS 'Speeds up reseller child org queries';



CREATE INDEX "idx_organizations_rate_limit" ON "public"."organizations" USING "gin" ("rate_limit_config");



CREATE INDEX "idx_organizations_status" ON "public"."organizations" USING "btree" ("status");



CREATE INDEX "idx_organizations_type" ON "public"."organizations" USING "btree" ("organization_type");



CREATE INDEX "idx_organizations_type_parent" ON "public"."organizations" USING "btree" ("organization_type", "parent_organization_id");



CREATE INDEX "idx_organizations_updated_at" ON "public"."organizations" USING "btree" ("updated_at");



CREATE INDEX "idx_orgs_deleted_at" ON "public"."organizations" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_orgs_direct_billing" ON "public"."organizations" USING "btree" ("allow_direct_billing");



CREATE INDEX "idx_passkey_challenges_challenge" ON "public"."passkey_challenges" USING "btree" ("challenge");



CREATE INDEX "idx_passkey_challenges_expires" ON "public"."passkey_challenges" USING "btree" ("expires_at");



CREATE INDEX "idx_passkey_challenges_user_id" ON "public"."passkey_challenges" USING "btree" ("user_id");



CREATE INDEX "idx_payment_transactions_org" ON "public"."payment_transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_transactions_org_id" ON "public"."payment_transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_transactions_reference" ON "public"."payment_transactions" USING "btree" ("reference");



CREATE INDEX "idx_payments_method" ON "public"."staff_payments" USING "btree" ("payment_method");



CREATE INDEX "idx_payments_org_date" ON "public"."staff_payments" USING "btree" ("organization_id", "payment_date" DESC);



CREATE INDEX "idx_payments_settlement" ON "public"."staff_payments" USING "btree" ("settlement_id");



CREATE INDEX "idx_payments_staff_date" ON "public"."staff_payments" USING "btree" ("staff_id", "payment_date" DESC);



CREATE INDEX "idx_payroll_periods_org_date" ON "public"."staff_payroll_periods" USING "btree" ("organization_id", "period_start" DESC);



CREATE INDEX "idx_payroll_periods_status" ON "public"."staff_payroll_periods" USING "btree" ("status");



CREATE INDEX "idx_pending_inputs_conversation" ON "public"."workflow_pending_inputs" USING "btree" ("conversation_id") WHERE ("status" = 'waiting'::"text");



CREATE INDEX "idx_pending_inputs_org" ON "public"."workflow_pending_inputs" USING "btree" ("organization_id");



CREATE INDEX "idx_pending_inputs_status" ON "public"."workflow_pending_inputs" USING "btree" ("status") WHERE ("status" = 'waiting'::"text");



CREATE INDEX "idx_pending_inputs_timeout" ON "public"."workflow_pending_inputs" USING "btree" ("timeout_at") WHERE (("status" = 'waiting'::"text") AND ("timeout_at" IS NOT NULL));



CREATE INDEX "idx_pipeline_stages_org" ON "public"."pipeline_stages" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_portal_access_logs_client" ON "public"."portal_access_logs" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "idx_portal_access_logs_created" ON "public"."portal_access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_portal_access_logs_org" ON "public"."portal_access_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_portal_config_app" ON "public"."saas_apps_portal_config" USING "btree" ("app_id", "is_enabled", "display_order");



CREATE INDEX "idx_process_instances_lead" ON "public"."process_instances" USING "btree" ("lead_id");



CREATE INDEX "idx_process_instances_org" ON "public"."process_instances" USING "btree" ("organization_id");



CREATE INDEX "idx_process_states_lookup" ON "public"."process_states" USING "btree" ("organization_id", "type", "key");



CREATE INDEX "idx_profiles_platform_role" ON "public"."profiles" USING "btree" ("platform_role") WHERE ("platform_role" <> 'user'::"text");



CREATE INDEX "idx_providers_category" ON "public"."integration_providers" USING "btree" ("category");



CREATE INDEX "idx_providers_key" ON "public"."integration_providers" USING "btree" ("key");



CREATE INDEX "idx_quick_replies_org" ON "public"."quick_replies" USING "btree" ("organization_id");



CREATE INDEX "idx_quick_replies_shortcut" ON "public"."quick_replies" USING "btree" ("shortcut");



CREATE INDEX "idx_quotes_deleted_at" ON "public"."quotes" USING "btree" ("deleted_at");



CREATE INDEX "idx_quotes_emitter_id" ON "public"."quotes" USING "btree" ("emitter_id");



CREATE INDEX "idx_quotes_org_deleted" ON "public"."quotes" USING "btree" ("organization_id", "deleted_at");



CREATE INDEX "idx_quotes_org_id" ON "public"."quotes" USING "btree" ("organization_id");



CREATE INDEX "idx_quotes_org_status" ON "public"."quotes" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_quotes_organization_id" ON "public"."quotes" USING "btree" ("organization_id");



CREATE INDEX "idx_ral_reseller_client" ON "public"."reseller_activity_log" USING "btree" ("reseller_org_id", "client_org_id", "activity_date");



CREATE INDEX "idx_reactions_message" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_resto_sessions_org" ON "public"."resto_table_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_resto_sessions_table" ON "public"."resto_table_sessions" USING "btree" ("table_id");



CREATE INDEX "idx_resto_tables_org" ON "public"."resto_tables" USING "btree" ("organization_id");



CREATE INDEX "idx_resto_tables_zone" ON "public"."resto_tables" USING "btree" ("zone_id");



CREATE INDEX "idx_resto_zones_org" ON "public"."resto_zones" USING "btree" ("organization_id");



CREATE INDEX "idx_rsr_effective" ON "public"."revenue_share_rules" USING "btree" ("effective_from", "effective_to");



CREATE INDEX "idx_rsr_phase" ON "public"."revenue_share_rules" USING "btree" ("phase_start_month", "phase_end_month");



CREATE INDEX "idx_rsr_reseller" ON "public"."revenue_share_rules" USING "btree" ("reseller_org_id");



CREATE INDEX "idx_saas_app_add_ons_app" ON "public"."saas_app_add_ons" USING "btree" ("app_id");



CREATE INDEX "idx_saas_app_modules_app" ON "public"."saas_app_modules" USING "btree" ("app_id");



CREATE INDEX "idx_saas_apps_active" ON "public"."saas_apps" USING "btree" ("is_active");



CREATE INDEX "idx_saas_apps_category" ON "public"."saas_apps" USING "btree" ("category");



CREATE INDEX "idx_saas_apps_featured" ON "public"."saas_apps" USING "btree" ("is_featured");



CREATE INDEX "idx_saas_apps_recommended_verticals" ON "public"."saas_apps" USING "gin" ("recommended_for_verticals");



CREATE INDEX "idx_saas_platform_invoices_created_at" ON "public"."saas_platform_invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_saas_platform_invoices_org_id" ON "public"."saas_platform_invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_saas_platform_invoices_status" ON "public"."saas_platform_invoices" USING "btree" ("status");



CREATE INDEX "idx_saas_subscriptions_org_id" ON "public"."saas_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_saas_subscriptions_status" ON "public"."saas_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_scheduled_jobs_org" ON "public"."scheduled_workflow_jobs" USING "btree" ("organization_id");



CREATE INDEX "idx_scheduled_jobs_status_time" ON "public"."scheduled_workflow_jobs" USING "btree" ("status", "scheduled_for") WHERE ("status" = 'pending'::"public"."scheduled_job_status");



CREATE INDEX "idx_scheduled_jobs_workflow" ON "public"."scheduled_workflow_jobs" USING "btree" ("workflow_id");



CREATE INDEX "idx_sentiment_alerts_conversation" ON "public"."sentiment_alerts" USING "btree" ("conversation_id");



CREATE INDEX "idx_sentiment_alerts_unacknowledged" ON "public"."sentiment_alerts" USING "btree" ("created_at" DESC) WHERE ("acknowledged_at" IS NULL);



CREATE INDEX "idx_sequences_campaign" ON "public"."marketing_sequences" USING "btree" ("campaign_id");



CREATE INDEX "idx_service_catalog_category" ON "public"."service_catalog" USING "btree" ("category");



CREATE INDEX "idx_service_catalog_metadata" ON "public"."service_catalog" USING "gin" ("metadata");



CREATE INDEX "idx_service_catalog_org" ON "public"."service_catalog" USING "btree" ("organization_id");



CREATE INDEX "idx_service_categories_order" ON "public"."service_categories" USING "btree" ("organization_id", "order_index");



CREATE INDEX "idx_service_categories_org" ON "public"."service_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_service_categories_scope" ON "public"."service_categories" USING "btree" ("scope");



CREATE INDEX "idx_services_deleted" ON "public"."services" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_services_deleted_at" ON "public"."services" USING "btree" ("deleted_at");



CREATE INDEX "idx_services_org" ON "public"."services" USING "btree" ("organization_id");



CREATE INDEX "idx_services_org_deleted" ON "public"."services" USING "btree" ("organization_id", "deleted_at");



CREATE INDEX "idx_services_org_id" ON "public"."services" USING "btree" ("organization_id");



CREATE INDEX "idx_services_org_status" ON "public"."services" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_services_organization_id" ON "public"."services" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_settlement_unique" ON "public"."settlements" USING "btree" ("reseller_org_id", "period_start", "period_end");



CREATE INDEX "idx_settlements_org" ON "public"."staff_payroll_settlements" USING "btree" ("organization_id");



CREATE INDEX "idx_settlements_period" ON "public"."staff_payroll_settlements" USING "btree" ("payroll_period_id");



CREATE INDEX "idx_settlements_staff_date" ON "public"."staff_payroll_settlements" USING "btree" ("staff_id", "created_at" DESC);



CREATE INDEX "idx_settlements_status" ON "public"."staff_payroll_settlements" USING "btree" ("payment_status");



CREATE INDEX "idx_staff_profiles_org" ON "public"."staff_profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_staff_shifts_org_id" ON "public"."staff_shifts" USING "btree" ("organization_id");



CREATE INDEX "idx_staff_work_logs_org_id" ON "public"."staff_work_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_steps_sequence" ON "public"."marketing_steps" USING "btree" ("sequence_id");



CREATE INDEX "idx_storage_usage_org" ON "public"."storage_usage" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_deleted_at" ON "public"."subscriptions" USING "btree" ("deleted_at");



CREATE INDEX "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_system_alerts_active" ON "public"."system_alerts" USING "btree" ("is_active", "expires_at");



CREATE INDEX "idx_system_modules_category" ON "public"."system_modules" USING "btree" ("category");



CREATE INDEX "idx_system_modules_compatible_verticals" ON "public"."system_modules" USING "gin" ("compatible_verticals");



CREATE INDEX "idx_system_modules_is_core" ON "public"."system_modules" USING "btree" ("is_core");



CREATE INDEX "idx_tasks_assigned" ON "public"."crm_tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_due_date" ON "public"."crm_tasks" USING "btree" ("due_date") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_tasks_lead" ON "public"."crm_tasks" USING "btree" ("lead_id");



CREATE INDEX "idx_tasks_org_status" ON "public"."crm_tasks" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_usage_counters_org" ON "public"."usage_counters" USING "btree" ("organization_id");



CREATE INDEX "idx_usage_counters_period" ON "public"."usage_counters" USING "btree" ("organization_id", "engine", "period_start");



CREATE INDEX "idx_usage_engine" ON "public"."usage_events" USING "btree" ("engine");



CREATE INDEX "idx_usage_limits_org" ON "public"."usage_limits" USING "btree" ("organization_id");



CREATE INDEX "idx_usage_org_engine_time" ON "public"."usage_events" USING "btree" ("organization_id", "engine", "occurred_at" DESC);



CREATE INDEX "idx_usage_org_time" ON "public"."usage_events" USING "btree" ("organization_id", "occurred_at");



CREATE INDEX "idx_usage_parent" ON "public"."usage_events" USING "btree" ("parent_organization_id");



CREATE INDEX "idx_user_passkeys_credential_id" ON "public"."user_passkeys" USING "btree" ("credential_id");



CREATE INDEX "idx_user_passkeys_user_id" ON "public"."user_passkeys" USING "btree" ("user_id");



CREATE INDEX "idx_wf_executions_org" ON "public"."workflow_executions" USING "btree" ("organization_id");



CREATE INDEX "idx_wf_executions_status" ON "public"."workflow_executions" USING "btree" ("status");



CREATE INDEX "idx_wf_executions_wf" ON "public"."workflow_executions" USING "btree" ("workflow_id");



CREATE INDEX "idx_wf_logs_execution" ON "public"."workflow_logs" USING "btree" ("execution_id");



CREATE INDEX "idx_work_logs_appointment" ON "public"."staff_work_logs" USING "btree" ("appointment_id") WHERE ("appointment_id" IS NOT NULL);



CREATE INDEX "idx_work_logs_org_date" ON "public"."staff_work_logs" USING "btree" ("organization_id", "start_time" DESC);



CREATE INDEX "idx_work_logs_settled_date" ON "public"."staff_work_logs" USING "btree" ("staff_id", "settled_at") WHERE ("settled_at" IS NOT NULL);



CREATE INDEX "idx_work_logs_staff_date" ON "public"."staff_work_logs" USING "btree" ("staff_id", "start_time" DESC);



CREATE INDEX "idx_work_logs_unsettled" ON "public"."staff_work_logs" USING "btree" ("staff_id", "organization_id") WHERE ("settled_at" IS NULL);



CREATE INDEX "idx_workflow_permissions_org" ON "public"."workflow_permissions" USING "btree" ("organization_id");



CREATE INDEX "idx_workflow_permissions_user" ON "public"."workflow_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_permissions_workflow" ON "public"."workflow_permissions" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflow_versions_workflow_id" ON "public"."workflow_versions" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflows_org" ON "public"."workflows" USING "btree" ("organization_id");



CREATE INDEX "idx_workflows_status" ON "public"."workflows" USING "btree" ("organization_id", "is_active");



CREATE INDEX "invoices_service_id_idx" ON "public"."invoices" USING "btree" ("service_id");



CREATE UNIQUE INDEX "organization_settings_org_idx" ON "public"."organization_settings" USING "btree" ("organization_id");



CREATE INDEX "quotes_service_id_idx" ON "public"."quotes" USING "btree" ("service_id");



CREATE INDEX "services_client_id_idx" ON "public"."services" USING "btree" ("client_id");



CREATE INDEX "services_next_billing_date_idx" ON "public"."services" USING "btree" ("next_billing_date");



CREATE UNIQUE INDEX "unique_active_conversation_multiwaba_idx" ON "public"."conversations" USING "btree" ("lead_id", "channel", COALESCE("connection_id", '00000000-0000-0000-0000-000000000000'::"uuid")) WHERE ("state" = 'active'::"text");



COMMENT ON INDEX "public"."unique_active_conversation_multiwaba_idx" IS 'Ensures only one active conversation exists per lead per channel per WABA connection';



CREATE RULE "no_delete_audit" AS
    ON DELETE TO "public"."billing_audit_log" DO INSTEAD NOTHING;



CREATE RULE "no_update_audit" AS
    ON UPDATE TO "public"."billing_audit_log" DO INSTEAD NOTHING;



CREATE OR REPLACE TRIGGER "broadcasts_updated_at" BEFORE UPDATE ON "public"."broadcasts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "enforce_dian_immutability" BEFORE UPDATE ON "public"."dian_documents" FOR EACH ROW EXECUTE FUNCTION "public"."protect_dian_evidence"();



CREATE OR REPLACE TRIGGER "handle_updated_at_resto_table_sessions" BEFORE UPDATE ON "public"."resto_table_sessions" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at_resto_tables" BEFORE UPDATE ON "public"."resto_tables" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at_resto_zones" BEFORE UPDATE ON "public"."resto_zones" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "on_cart_create_sync" AFTER INSERT ON "public"."deal_carts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_lead_value"();



CREATE OR REPLACE TRIGGER "on_cart_item_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_cart_total"();



CREATE OR REPLACE TRIGGER "on_cart_total_sync" AFTER UPDATE OF "total_amount" ON "public"."deal_carts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_lead_value"();



CREATE OR REPLACE TRIGGER "on_message_upsert_sync_conversation" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "on_new_message_unsnooze" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_message_unsnooze"();



CREATE OR REPLACE TRIGGER "on_service_soft_delete_cancel_invoices" AFTER UPDATE OF "deleted_at" ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."cancel_invoices_on_service_soft_delete"();



CREATE OR REPLACE TRIGGER "pipeline_stages_updated_at" BEFORE UPDATE ON "public"."pipeline_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_pipeline_stages_updated_at"();



CREATE OR REPLACE TRIGGER "set_attendance_shifts_updated_at" BEFORE UPDATE ON "public"."attendance_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "set_org_locations_updated_at" BEFORE UPDATE ON "public"."organization_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "set_org_staff_updated_at" BEFORE UPDATE ON "public"."organization_staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."saas_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tr_auto_provision_agent" AFTER INSERT ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_org_member_agent"();



CREATE OR REPLACE TRIGGER "tr_log_agent_status_change" BEFORE INSERT OR UPDATE ON "public"."agent_availability" FOR EACH ROW EXECUTE FUNCTION "public"."log_agent_status_change"();



CREATE OR REPLACE TRIGGER "tr_sync_agent_channels" AFTER UPDATE OF "permissions" ON "public"."organization_members" FOR EACH ROW WHEN ((("old"."permissions" -> 'inbox_access'::"text") IS DISTINCT FROM ("new"."permissions" -> 'inbox_access'::"text"))) EXECUTE FUNCTION "public"."sync_agent_channels_from_permissions"();



CREATE OR REPLACE TRIGGER "tr_sync_assignment_to_lead" AFTER INSERT OR UPDATE OF "assigned_to" ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_conversation_assignment_to_lead"();



CREATE OR REPLACE TRIGGER "tr_sync_member_details" AFTER INSERT ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_member_details"();



CREATE OR REPLACE TRIGGER "tr_update_conversation_metrics" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_metrics"();



CREATE OR REPLACE TRIGGER "trg_saas_platform_invoice_number" BEFORE INSERT ON "public"."saas_platform_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."generate_saas_platform_invoice_number"();



CREATE OR REPLACE TRIGGER "trigger_auto_provision_limits" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_provision_org_limits"();



CREATE OR REPLACE TRIGGER "trigger_create_default_pipeline_stages" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_pipeline_stages"();



COMMENT ON TRIGGER "trigger_create_default_pipeline_stages" ON "public"."organizations" IS 'Auto-creates pipeline stages when organization is created';



CREATE OR REPLACE TRIGGER "trigger_payment_config_audit" AFTER UPDATE ON "public"."payment_gateway_config" FOR EACH ROW EXECUTE FUNCTION "public"."log_payment_config_change"();



CREATE OR REPLACE TRIGGER "trigger_protect_acquisition_date" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."protect_acquisition_date"();



CREATE OR REPLACE TRIGGER "trigger_set_audit_hash" BEFORE INSERT ON "public"."billing_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_audit_hash"();



CREATE OR REPLACE TRIGGER "trigger_set_message_org" BEFORE INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_message_organization_id"();



CREATE OR REPLACE TRIGGER "trigger_set_trial_expiry" BEFORE INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_trial_expiry"();



CREATE OR REPLACE TRIGGER "trigger_set_usage_parent_org" BEFORE INSERT ON "public"."usage_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_usage_parent_org"();



CREATE OR REPLACE TRIGGER "trigger_sync_quote_to_lead" AFTER UPDATE ON "public"."quotes" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."sync_quote_to_lead"();



CREATE OR REPLACE TRIGGER "trigger_update_agent_load" AFTER INSERT OR DELETE OR UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_agent_load_on_change"();



CREATE OR REPLACE TRIGGER "trigger_update_lead_activity" AFTER INSERT OR UPDATE ON "public"."crm_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_lead_activity"();



CREATE OR REPLACE TRIGGER "trigger_update_limits" AFTER INSERT OR DELETE OR UPDATE ON "public"."billing_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_provision_limits"();



CREATE OR REPLACE TRIGGER "trigger_update_scheduled_job_timestamp" BEFORE UPDATE ON "public"."scheduled_workflow_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_scheduled_job_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_settlement_status" AFTER INSERT OR DELETE OR UPDATE ON "public"."staff_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_settlement_payment_status"();



CREATE OR REPLACE TRIGGER "update_agent_presence_updated_at" BEFORE UPDATE ON "public"."agent_presence" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_briefing_responses_updated_at" BEFORE UPDATE ON "public"."briefing_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_briefing_response_updated_at"();



CREATE OR REPLACE TRIGGER "update_briefings_updated_at" BEFORE UPDATE ON "public"."briefings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_contract_timestamp"();



CREATE OR REPLACE TRIGGER "update_conversations_timestamp" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_dian_documents_modtime" BEFORE UPDATE ON "public"."dian_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_global_dashboard_banners_modtime" BEFORE UPDATE ON "public"."global_dashboard_banners" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_integration_connections_modtime" BEFORE UPDATE ON "public"."integration_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meta_org_ads_metrics_modtime" BEFORE UPDATE ON "public"."meta_org_ads_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quick_replies_updated_at" BEFORE UPDATE ON "public"."quick_replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quote_settings_updated_at" BEFORE UPDATE ON "public"."quote_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_modtime" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_workflows_modtime" BEFORE UPDATE ON "public"."workflows" FOR EACH ROW EXECUTE FUNCTION "public"."update_workflow_timestamp"();



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_new_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_new_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_channels"
    ADD CONSTRAINT "agent_channels_agent_fkey" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "public"."agent_availability"("organization_id", "agent_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_channels"
    ADD CONSTRAINT "agent_channels_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_channels"
    ADD CONSTRAINT "agent_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_presence"
    ADD CONSTRAINT "agent_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_qa_reports"
    ADD CONSTRAINT "agent_qa_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_new_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_skills"
    ADD CONSTRAINT "agent_skills_new_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_status_history"
    ADD CONSTRAINT "agent_status_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_status_history"
    ADD CONSTRAINT "agent_status_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_cache"
    ADD CONSTRAINT "ai_cache_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_credentials"
    ADD CONSTRAINT "ai_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_credentials"
    ADD CONSTRAINT "ai_credentials_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id");



ALTER TABLE ONLY "public"."ai_image_generation_logs"
    ADD CONSTRAINT "ai_image_generation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."ai_image_generation_logs"
    ADD CONSTRAINT "ai_image_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."ai_credentials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."assignment_history"
    ADD CONSTRAINT "assignment_history_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assignment_history"
    ADD CONSTRAINT "assignment_history_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_history"
    ADD CONSTRAINT "assignment_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_history"
    ADD CONSTRAINT "assignment_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."assignment_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_logs"
    ADD CONSTRAINT "attendance_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."organization_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_logs"
    ADD CONSTRAINT "attendance_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_logs"
    ADD CONSTRAINT "attendance_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."organization_staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_shifts"
    ADD CONSTRAINT "attendance_shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."organization_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_shifts"
    ADD CONSTRAINT "attendance_shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_shifts"
    ADD CONSTRAINT "attendance_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."organization_staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_queue"
    ADD CONSTRAINT "automation_queue_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billable_events"
    ADD CONSTRAINT "billable_events_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "public"."revenue_share_rules"("id");



ALTER TABLE ONLY "public"."billable_events"
    ADD CONSTRAINT "billable_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_cycles"
    ADD CONSTRAINT "billing_cycles_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_cycles"
    ADD CONSTRAINT "billing_cycles_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_overage_rates"
    ADD CONSTRAINT "billing_overage_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."billing_packages"("id");



ALTER TABLE ONLY "public"."briefing_fields"
    ADD CONSTRAINT "briefing_fields_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."briefing_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefing_responses"
    ADD CONSTRAINT "briefing_responses_briefing_id_fkey" FOREIGN KEY ("briefing_id") REFERENCES "public"."briefings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefing_steps"
    ADD CONSTRAINT "briefing_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."briefing_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefing_templates"
    ADD CONSTRAINT "briefing_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."briefing_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."deal_carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."service_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_categories"
    ADD CONSTRAINT "client_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_events"
    ADD CONSTRAINT "client_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."client_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_intents"
    ADD CONSTRAINT "conversation_intents_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_intents"
    ADD CONSTRAINT "conversation_intents_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_lead_tags"
    ADD CONSTRAINT "crm_lead_tags_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_lead_tags"
    ADD CONSTRAINT "crm_lead_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tags"
    ADD CONSTRAINT "crm_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_snapshots"
    ADD CONSTRAINT "data_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."data_snapshots"
    ADD CONSTRAINT "data_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."deal_carts"
    ADD CONSTRAINT "deal_carts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_carts"
    ADD CONSTRAINT "deal_carts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dian_documents"
    ADD CONSTRAINT "dian_documents_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emitters"
    ADD CONSTRAINT "emitters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "fk_current_session" FOREIGN KEY ("current_session_id") REFERENCES "public"."resto_table_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "fk_work_order_staff" FOREIGN KEY ("organization_id", "assigned_staff_id") REFERENCES "public"."organization_members"("organization_id", "user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hosting_accounts"
    ADD CONSTRAINT "hosting_accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hosting_accounts"
    ADD CONSTRAINT "hosting_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_connections"
    ADD CONSTRAINT "integration_connections_default_pipeline_stage_id_fkey" FOREIGN KEY ("default_pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."integration_connections"
    ADD CONSTRAINT "integration_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_connections"
    ADD CONSTRAINT "integration_connections_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."integration_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."intent_routing_rules"
    ADD CONSTRAINT "intent_routing_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."billing_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "public"."emitters"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."client_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_master_contact_id_fkey" FOREIGN KEY ("master_contact_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_source_connection_id_fkey" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lifecycle_notifications"
    ADD CONSTRAINT "lifecycle_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_documents"
    ADD CONSTRAINT "manifest_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_documents"
    ADD CONSTRAINT "manifest_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."manifest_imeis"
    ADD CONSTRAINT "manifest_imeis_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."manifest_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_imeis"
    ADD CONSTRAINT "manifest_imeis_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_audiences"
    ADD CONSTRAINT "marketing_audiences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."marketing_audiences"
    ADD CONSTRAINT "marketing_audiences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."marketing_audiences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "public"."marketing_steps"("id");



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_enrollments"
    ADD CONSTRAINT "marketing_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "public"."marketing_sequences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_sequences"
    ADD CONSTRAINT "marketing_sequences_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_sequences"
    ADD CONSTRAINT "marketing_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_steps"
    ADD CONSTRAINT "marketing_steps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_steps"
    ADD CONSTRAINT "marketing_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "public"."marketing_sequences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messaging_templates"
    ADD CONSTRAINT "messaging_templates_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."integration_connections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messaging_templates"
    ADD CONSTRAINT "messaging_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meta_ads_metrics"
    ADD CONSTRAINT "meta_ads_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meta_org_ads_metrics"
    ADD CONSTRAINT "meta_org_ads_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meta_social_metrics"
    ADD CONSTRAINT "meta_social_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_add_ons"
    ADD CONSTRAINT "organization_add_ons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_audit_log"
    ADD CONSTRAINT "organization_audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_audit_log"
    ADD CONSTRAINT "organization_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_audit_log"
    ADD CONSTRAINT "organization_audit_log_performed_by_profiles_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_billing_profiles"
    ADD CONSTRAINT "organization_billing_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_locations"
    ADD CONSTRAINT "organization_locations_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_locations"
    ADD CONSTRAINT "organization_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."organization_roles"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_modules"
    ADD CONSTRAINT "organization_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_roles"
    ADD CONSTRAINT "organization_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_saas_products"
    ADD CONSTRAINT "organization_saas_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_saas_products"
    ADD CONSTRAINT "organization_saas_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."saas_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sequences"
    ADD CONSTRAINT "organization_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_smtp_configs"
    ADD CONSTRAINT "organization_smtp_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."organization_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_acquired_by_reseller_id_fkey" FOREIGN KEY ("acquired_by_reseller_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_active_app_id_fkey" FOREIGN KEY ("active_app_id") REFERENCES "public"."saas_apps"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_branding_tier_id_fkey" FOREIGN KEY ("branding_tier_id") REFERENCES "public"."branding_tiers"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_parent_organization_id_fkey" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_subscription_product_id_fkey" FOREIGN KEY ("subscription_product_id") REFERENCES "public"."saas_products"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_vertical_key_fkey" FOREIGN KEY ("vertical_key") REFERENCES "public"."verticals"("key");



ALTER TABLE ONLY "public"."passkey_challenges"
    ADD CONSTRAINT "passkey_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_accounts"
    ADD CONSTRAINT "payment_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_config_audit"
    ADD CONSTRAINT "payment_config_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_process_map"
    ADD CONSTRAINT "pipeline_process_map_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_process_map"
    ADD CONSTRAINT "pipeline_process_map_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_limit_definitions"
    ADD CONSTRAINT "plan_limit_definitions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_access_logs"
    ADD CONSTRAINT "portal_access_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_access_logs"
    ADD CONSTRAINT "portal_access_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_instances"
    ADD CONSTRAINT "process_instances_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_instances"
    ADD CONSTRAINT "process_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_states"
    ADD CONSTRAINT "process_states_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_replies"
    ADD CONSTRAINT "quick_replies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quick_replies"
    ADD CONSTRAINT "quick_replies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_settings"
    ADD CONSTRAINT "quote_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "public"."emitters"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reseller_activity_log"
    ADD CONSTRAINT "reseller_activity_log_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reseller_activity_log"
    ADD CONSTRAINT "reseller_activity_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reseller_activity_log"
    ADD CONSTRAINT "reseller_activity_log_reseller_org_id_fkey" FOREIGN KEY ("reseller_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_table_sessions"
    ADD CONSTRAINT "resto_table_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."organization_staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resto_table_sessions"
    ADD CONSTRAINT "resto_table_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."organization_staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resto_table_sessions"
    ADD CONSTRAINT "resto_table_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_table_sessions"
    ADD CONSTRAINT "resto_table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."resto_tables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "resto_tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_tables"
    ADD CONSTRAINT "resto_tables_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."resto_zones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resto_zones"
    ADD CONSTRAINT "resto_zones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_share_rules"
    ADD CONSTRAINT "revenue_share_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."revenue_share_rules"
    ADD CONSTRAINT "revenue_share_rules_reseller_org_id_fkey" FOREIGN KEY ("reseller_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_app_add_ons"
    ADD CONSTRAINT "saas_app_add_ons_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."saas_apps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_app_modules"
    ADD CONSTRAINT "saas_app_modules_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."saas_apps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_apps_portal_config"
    ADD CONSTRAINT "saas_apps_portal_config_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."saas_apps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_platform_invoices"
    ADD CONSTRAINT "saas_platform_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_platform_invoices"
    ADD CONSTRAINT "saas_platform_invoices_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."saas_product_modules"
    ADD CONSTRAINT "saas_product_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_product_modules"
    ADD CONSTRAINT "saas_product_modules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."saas_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_product_packages"
    ADD CONSTRAINT "saas_product_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."billing_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_product_packages"
    ADD CONSTRAINT "saas_product_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."saas_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "saas_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "saas_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."saas_apps"("id");



ALTER TABLE ONLY "public"."scheduled_workflow_jobs"
    ADD CONSTRAINT "scheduled_workflow_jobs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_workflow_jobs"
    ADD CONSTRAINT "scheduled_workflow_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_workflow_jobs"
    ADD CONSTRAINT "scheduled_workflow_jobs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sentiment_alerts"
    ADD CONSTRAINT "sentiment_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sentiment_alerts"
    ADD CONSTRAINT "sentiment_alerts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sentiment_alerts"
    ADD CONSTRAINT "sentiment_alerts_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sentiment_alerts"
    ADD CONSTRAINT "sentiment_alerts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "public"."emitters"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_reseller_org_id_fkey" FOREIGN KEY ("reseller_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."staff_payments"
    ADD CONSTRAINT "staff_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_payments"
    ADD CONSTRAINT "staff_payments_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."organization_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_payments"
    ADD CONSTRAINT "staff_payments_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."staff_payroll_settlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_payroll_periods"
    ADD CONSTRAINT "staff_payroll_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."organization_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_payroll_periods"
    ADD CONSTRAINT "staff_payroll_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_payroll_periods"
    ADD CONSTRAINT "staff_payroll_periods_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."organization_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_payroll_settlements"
    ADD CONSTRAINT "staff_payroll_settlements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."organization_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_payroll_settlements"
    ADD CONSTRAINT "staff_payroll_settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_payroll_settlements"
    ADD CONSTRAINT "staff_payroll_settlements_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."staff_payroll_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."organization_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_work_logs"
    ADD CONSTRAINT "staff_work_logs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."organization_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_work_logs"
    ADD CONSTRAINT "staff_work_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."system_modules"
    ADD CONSTRAINT "system_modules_parent_module_key_fkey" FOREIGN KEY ("parent_module_key") REFERENCES "public"."system_modules"("key");



ALTER TABLE ONLY "public"."usage_counters"
    ADD CONSTRAINT "usage_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_parent_organization_id_fkey" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_passkeys"
    ADD CONSTRAINT "user_passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vertical_modules"
    ADD CONSTRAINT "vertical_modules_vertical_key_fkey" FOREIGN KEY ("vertical_key") REFERENCES "public"."verticals"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_logs"
    ADD CONSTRAINT "workflow_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_logs"
    ADD CONSTRAINT "workflow_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_pending_inputs"
    ADD CONSTRAINT "workflow_pending_inputs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_pending_inputs"
    ADD CONSTRAINT "workflow_pending_inputs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_pending_inputs"
    ADD CONSTRAINT "workflow_pending_inputs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_permissions"
    ADD CONSTRAINT "workflow_permissions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Access Services & Catalog" ON "public"."services" FOR SELECT TO "authenticated" USING ((("is_catalog_item" = true) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."user_id" = "auth"."uid"())))));



CREATE POLICY "Access own organization imeis" ON "public"."manifest_imeis" USING (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Access own organization manifests" ON "public"."manifest_documents" USING (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Admin access" ON "public"."organization_saas_products" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Admin can do everything on client_events" ON "public"."client_events" USING ((EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "client_events"."client_id") AND ("clients"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admin can do everything on clients" ON "public"."clients" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Admin can do everything on invoices" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "invoices"."client_id") AND ("clients"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admin can do everything on leads" ON "public"."leads" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Admin can do everything on quotes" ON "public"."quotes" USING (((("client_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "quotes"."client_id") AND ("clients"."user_id" = "auth"."uid"()))))) OR (("lead_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."leads"
  WHERE (("leads"."id" = "quotes"."lead_id") AND ("leads"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Admin can do everything on services" ON "public"."services" USING ((EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "services"."client_id") AND ("clients"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admin can do everything on subscriptions" ON "public"."subscriptions" USING ((EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "subscriptions"."client_id") AND ("clients"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admin full access" ON "public"."saas_product_modules" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Admin full access" ON "public"."saas_products" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Admin full access" ON "public"."system_modules" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Admins can manage briefings" ON "public"."briefings" TO "authenticated" USING (true);



CREATE POLICY "Admins can manage channels" ON "public"."channels" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "channels"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage fields" ON "public"."briefing_fields" TO "authenticated" USING (true);



CREATE POLICY "Admins can manage integrations" ON "public"."integration_configs" USING (false);



CREATE POLICY "Admins can manage mappings" ON "public"."pipeline_process_map" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage organization locations" ON "public"."organization_locations" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage payment methods" ON "public"."organization_payment_methods" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage payments" ON "public"."staff_payments" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage payroll periods" ON "public"."staff_payroll_periods" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage permissions" ON "public"."workflow_permissions" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage pipelines" ON "public"."pipelines" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage portal config" ON "public"."saas_apps_portal_config" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "Admins can manage process states" ON "public"."process_states" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage rules" ON "public"."assignment_rules" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage settlements" ON "public"."staff_payroll_settlements" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage steps" ON "public"."briefing_steps" TO "authenticated" USING (true);



CREATE POLICY "Admins can manage templates" ON "public"."briefing_templates" TO "authenticated" USING (true);



CREATE POLICY "Admins can manage templates" ON "public"."messaging_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "messaging_templates"."organization_id") AND ("organization_members"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins can manage their org's pipeline stages" ON "public"."pipeline_stages" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage their own ad metrics" ON "public"."meta_org_ads_metrics" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can manage work logs" ON "public"."staff_work_logs" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can view lifecycle notifications" ON "public"."lifecycle_notifications" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can view own transactions" ON "public"."payment_transactions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view reports" ON "public"."agent_qa_reports" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view responses" ON "public"."briefing_responses" TO "authenticated" USING (true);



CREATE POLICY "Admins can view their counters" ON "public"."usage_counters" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can view their limits" ON "public"."usage_limits" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can view their org audit logs" ON "public"."security_audit_logs" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins can view their organization subscription" ON "public"."saas_subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "saas_subscriptions"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admins can view their organization usage" ON "public"."usage_events" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Admins read packages" ON "public"."billing_packages" FOR SELECT USING (true);



CREATE POLICY "Admins/Owners can manage shifts" ON "public"."staff_shifts" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Agent Availability Organization Isolation" ON "public"."agent_availability" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "agent_availability"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agent Channels Organization Isolation" ON "public"."agent_channels" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "agent_channels"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agent Skills Organization Isolation" ON "public"."agent_skills" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "agent_skills"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow all access to admin users" ON "public"."global_dashboard_banners" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow full access for authenticated users" ON "public"."service_catalog" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow read access for authenticated users" ON "public"."service_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to authenticated users" ON "public"."global_dashboard_banners" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can insert logs via security definer" ON "public"."attendance_logs" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Anyone can view active plans" ON "public"."plan_templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view limit definitions" ON "public"."plan_limit_definitions" FOR SELECT USING (true);



CREATE POLICY "Authenticated can view channel definitions" ON "public"."channel_definitions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can manage emitters" ON "public"."emitters" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view payment transactions" ON "public"."payment_transactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view rates" ON "public"."billing_overage_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users may insert organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users view" ON "public"."meta_social_metrics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clients can view own ads metrics" ON "public"."meta_ads_metrics" FOR SELECT USING (("auth"."uid"() = ( SELECT "clients"."user_id"
   FROM "public"."clients"
  WHERE ("clients"."id" = "meta_ads_metrics"."client_id"))));



CREATE POLICY "Clients can view own social metrics" ON "public"."meta_social_metrics" FOR SELECT USING (("auth"."uid"() = ( SELECT "clients"."user_id"
   FROM "public"."clients"
  WHERE ("clients"."id" = "meta_social_metrics"."client_id"))));



CREATE POLICY "Enable all for authenticated users" ON "public"."billing_cycles" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users within organization" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable insert for authenticated users within organization" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable insert for authenticated users within organization" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable insert for organization members" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for organization members" ON "public"."crm_tasks" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for organization members" ON "public"."leads" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable select for authenticated users within organization" ON "public"."conversations" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable select for authenticated users within organization" ON "public"."leads" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable update for organization members" ON "public"."leads" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Everyone can read active alerts" ON "public"."system_alerts" FOR SELECT USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Everyone can read platform settings" ON "public"."platform_settings" FOR SELECT USING (true);



CREATE POLICY "Insert Own Settings" ON "public"."quote_settings" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage Audiences" ON "public"."marketing_audiences" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage Campaigns" ON "public"."marketing_campaigns" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage Sequences" ON "public"."marketing_sequences" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage Steps" ON "public"."marketing_steps" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage Tasks" ON "public"."crm_tasks" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage own hosting accounts" ON "public"."hosting_accounts" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Manage staff profiles (Admin/Owner)" ON "public"."staff_profiles" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Managers can manage staff" ON "public"."organization_staff" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Managers can view logs" ON "public"."attendance_logs" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Managers can view shifts" ON "public"."attendance_shifts" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Members can delete organization emitters" ON "public"."emitters" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can insert organization emitters" ON "public"."emitters" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can insert settings" ON "public"."organization_settings" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update organization emitters" ON "public"."emitters" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update own organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view organization emitters" ON "public"."emitters" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view organization locations" ON "public"."organization_locations" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view other members" ON "public"."organization_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))));



CREATE POLICY "Members can view own organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view their own organization" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Members can view their own settings" ON "public"."organization_settings" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members read own subs" ON "public"."billing_subscriptions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members view sequences" ON "public"."organization_sequences" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Only super_admins can modify platform_role" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "Org Access" ON "public"."work_orders" USING (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org Admins can manage credentials" ON "public"."ai_credentials" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Org Members View Modules" ON "public"."organization_modules" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org members can manage their own billing profile" ON "public"."organization_billing_profiles" TO "authenticated" USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Org members can view portal logs" ON "public"."portal_access_logs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org members can view storage usage" ON "public"."storage_usage" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org members can view their own ad metrics" ON "public"."meta_org_ads_metrics" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org members can view usage counters" ON "public"."usage_counters" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Org members can view usage limits" ON "public"."usage_limits" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organizations can view their own platform invoices" ON "public"."saas_platform_invoices" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can create snapshots" ON "public"."data_snapshots" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'owner'::"text")))));



CREATE POLICY "Owners can view own snapshots" ON "public"."data_snapshots" FOR SELECT USING (("organization_id" = ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners/Admins can update settings" ON "public"."organization_settings" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Platform admins can manage payment config" ON "public"."payment_gateway_config" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_members" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("o"."organization_type" = 'platform'::"text") AND ("om"."role" = 'owner'::"text")))));



CREATE POLICY "Public can read portal config" ON "public"."saas_apps_portal_config" FOR SELECT USING (true);



CREATE POLICY "Public can view fields" ON "public"."briefing_fields" FOR SELECT USING (true);



CREATE POLICY "Public can view providers" ON "public"."ai_providers" FOR SELECT USING (true);



CREATE POLICY "Public can view steps" ON "public"."briefing_steps" FOR SELECT USING (true);



CREATE POLICY "Public can view templates" ON "public"."briefing_templates" FOR SELECT USING (true);



CREATE POLICY "Public read" ON "public"."organization_saas_products" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."saas_product_modules" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."saas_product_packages" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."saas_products" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."system_modules" FOR SELECT USING (true);



CREATE POLICY "Public read providers" ON "public"."ai_providers" FOR SELECT USING (true);



CREATE POLICY "Public read vertical modules" ON "public"."vertical_modules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public read verticals" ON "public"."verticals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Resellers can create child organizations" ON "public"."organizations" FOR INSERT WITH CHECK (("parent_organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Resellers can view child organizations" ON "public"."organizations" FOR SELECT USING (("parent_organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Responses are viewable by everyone via RPC" ON "public"."briefing_responses" FOR SELECT USING (true);



CREATE POLICY "Service Role Full Access Ads" ON "public"."meta_ads_metrics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service Role Full Access Logs" ON "public"."ai_image_generation_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role admin providers" ON "public"."ai_providers" USING (true);



CREATE POLICY "Service role can insert logs" ON "public"."portal_access_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."workflow_pending_inputs" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access hosting" ON "public"."hosting_accounts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to briefing_responses" ON "public"."briefing_responses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to challenges" ON "public"."passkey_challenges" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to scheduled jobs" ON "public"."scheduled_workflow_jobs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role logs" ON "public"."ai_usage_logs" USING (true);



CREATE POLICY "Service role manages platform settings" ON "public"."platform_settings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role only audit" ON "public"."payment_config_audit" TO "service_role" USING (true);



CREATE POLICY "Service role only credentials" ON "public"."ai_credentials" TO "service_role" USING (true);



CREATE POLICY "Service role only registry" ON "public"."system_modules_registry" TO "service_role" USING (true);



CREATE POLICY "Service role settings" ON "public"."ai_settings" USING (true);



CREATE POLICY "Service role social" ON "public"."meta_social_metrics" USING (true);



CREATE POLICY "Super Admins can manage alerts" ON "public"."system_alerts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can insert audit logs" ON "public"."organization_audit_log" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can manage platform invoices" ON "public"."saas_platform_invoices" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "Super admins can view all organizations" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can view audit logs" ON "public"."organization_audit_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "SuperAdmins can manage all billing profiles" ON "public"."organization_billing_profiles" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "SuperAdmins can view availability backups" ON "public"."agent_availability_backup_before_sync" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "SuperAdmins can view skills backups" ON "public"."agent_skills_backup_before_sync" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "SuperAdmins full access" ON "public"."saas_subscriptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."platform_role" = 'super_admin'::"text")))));



CREATE POLICY "System can manage sequences" ON "public"."organization_sequences" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "System/Users can insert history" ON "public"."assignment_history" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation" ON "public"."briefing_templates" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."briefings" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."clients" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."conversations" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation" ON "public"."invoices" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."organization_settings" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation" ON "public"."quotes" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."services" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation" ON "public"."subscriptions" USING (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id")))) WITH CHECK (("organization_id" IN ( SELECT "get_auth_org_ids"."organization_id"
   FROM "public"."get_auth_org_ids"() "get_auth_org_ids"("organization_id"))));



CREATE POLICY "Tenant Isolation via Conversation" ON "public"."messages" USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))) WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Tenants can only view their own AI cache" ON "public"."ai_cache" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Update Own Settings" ON "public"."quote_settings" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can add reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can add to knowledge base" ON "public"."knowledge_base" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create AI suggestions for their org conversations" ON "public"."ai_suggestions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "ai_suggestions"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can create clients in their org" ON "public"."clients" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can create clients in their organization" ON "public"."clients" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "public"."get_auth_org_ids"() AS "get_auth_org_ids")));



CREATE POLICY "Users can create invoices in their org" ON "public"."invoices" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can create leads" ON "public"."leads" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can create org scheduled jobs" ON "public"."scheduled_workflow_jobs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create quick_replies in their org" ON "public"."quick_replies" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create quotes in their org" ON "public"."quotes" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can create saved_replies in their org" ON "public"."saved_replies" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create versions for their organization's workflows" ON "public"."workflow_versions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete clients in their org" ON "public"."clients" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete from knowledge base" ON "public"."knowledge_base" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete lead tags" ON "public"."crm_lead_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."crm_tags"
  WHERE (("crm_tags"."id" = "crm_lead_tags"."tag_id") AND ("crm_tags"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete messages in their conversations" ON "public"."messages" FOR DELETE USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete quotes in their org" ON "public"."quotes" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete saved_replies in their org" ON "public"."saved_replies" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete tags from their organization" ON "public"."crm_tags" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their leads" ON "public"."leads" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their org notifications" ON "public"."notifications" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their organization categories" ON "public"."client_categories" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their organization's clients" ON "public"."clients" FOR DELETE USING (("organization_id" IN ( SELECT "public"."get_auth_org_ids"() AS "get_auth_org_ids")));



CREATE POLICY "Users can delete their own passkeys" ON "public"."user_passkeys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert audit logs for their org" ON "public"."billing_audit_log" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert categories to their organization" ON "public"."client_categories" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert conversations for their organization" ON "public"."conversations" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert dian_documents for their organization" ON "public"."dian_documents" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert lead tags" ON "public"."crm_lead_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."crm_tags"
  WHERE (("crm_tags"."id" = "crm_lead_tags"."tag_id") AND ("crm_tags"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert messages in their conversations" ON "public"."messages" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert messages into their organization's conversatio" ON "public"."messages" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "c"."id"
   FROM "public"."conversations" "c"
  WHERE ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own presence" ON "public"."agent_presence" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert process instances in their org" ON "public"."process_instances" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert tags for their organization" ON "public"."crm_tags" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their org notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own passkeys" ON "public"."user_passkeys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage pipelines in their org" ON "public"."pipelines" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage sessions of their organization" ON "public"."resto_table_sessions" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
UNION
 SELECT "organization_staff"."organization_id"
   FROM "public"."organization_staff"
  WHERE ("organization_staff"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage stages in their org" ON "public"."pipeline_stages" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage tables of their organization" ON "public"."resto_tables" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
UNION
 SELECT "organization_staff"."organization_id"
   FROM "public"."organization_staff"
  WHERE ("organization_staff"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage tasks in their org" ON "public"."crm_tasks" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their org campaigns" ON "public"."email_campaigns" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their org smtp config" ON "public"."organization_smtp_configs" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their org templates" ON "public"."email_templates" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their organization workflows" ON "public"."workflows" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their own briefing responses" ON "public"."briefing_responses" USING (("briefing_id" IN ( SELECT "briefings"."id"
   FROM "public"."briefings"
  WHERE ("briefings"."client_id" IN ( SELECT "clients"."id"
           FROM "public"."clients"
          WHERE ("clients"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage workflows in their org" ON "public"."workflows" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage zones of their organization" ON "public"."resto_zones" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())
UNION
 SELECT "organization_staff"."organization_id"
   FROM "public"."organization_staff"
  WHERE ("organization_staff"."id" = "auth"."uid"()))));



CREATE POLICY "Users can modify cart_items of their organization" ON "public"."cart_items" USING ((EXISTS ( SELECT 1
   FROM "public"."deal_carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can modify deal_carts of their organization" ON "public"."deal_carts" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read audit logs from their org" ON "public"."billing_audit_log" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can remove own reactions" ON "public"."message_reactions" FOR DELETE USING ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update clients in their org" ON "public"."clients" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update conversations" ON "public"."conversations" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update conversations of their organization" ON "public"."conversations" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update invoices in their org" ON "public"."invoices" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update knowledge base" ON "public"."knowledge_base" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update messages in their conversations" ON "public"."messages" FOR UPDATE USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update org scheduled jobs" ON "public"."scheduled_workflow_jobs" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own presence" ON "public"."agent_presence" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND ("platform_role" = ( SELECT "profiles_1"."platform_role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))));



CREATE POLICY "Users can update process instances in their org" ON "public"."process_instances" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update quick_replies in their org" ON "public"."quick_replies" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update quotes in their org" ON "public"."quotes" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update saved_replies in their org" ON "public"."saved_replies" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update sentiment alerts" ON "public"."sentiment_alerts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "sentiment_alerts"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update tags from their organization" ON "public"."crm_tags" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their AI suggestions" ON "public"."ai_suggestions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "ai_suggestions"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update their leads" ON "public"."leads" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their org notifications" ON "public"."notifications" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their organization categories" ON "public"."client_categories" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their organization's clients" ON "public"."clients" FOR UPDATE USING (("organization_id" IN ( SELECT "public"."get_auth_org_ids"() AS "get_auth_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."get_auth_org_ids"() AS "get_auth_org_ids")));



CREATE POLICY "Users can update their own passkeys" ON "public"."user_passkeys" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view AI suggestions for their org conversations" ON "public"."ai_suggestions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "ai_suggestions"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view assignment history in their org" ON "public"."assignment_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "assignment_history"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view cart_items of their organization" ON "public"."cart_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."deal_carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view categories of their organization" ON "public"."client_categories" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view clients in their org" ON "public"."clients" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view conversations" ON "public"."conversations" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view conversations in their org" ON "public"."conversations" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("organization_id" IS NOT NULL)));



CREATE POLICY "Users can view conversations of their organization" ON "public"."conversations" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view deal_carts of their organization" ON "public"."deal_carts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view dian_documents of their organization" ON "public"."dian_documents" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view executions" ON "public"."workflow_executions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view history in their org" ON "public"."assignment_history" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view intents for their org conversations" ON "public"."conversation_intents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_intents"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view invoices in their org" ON "public"."invoices" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view knowledge base of their organization" ON "public"."knowledge_base" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view lead tags via tag organization" ON "public"."crm_lead_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_tags"
  WHERE (("crm_tags"."id" = "crm_lead_tags"."tag_id") AND ("crm_tags"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view leads" ON "public"."leads" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view leads in their org" ON "public"."leads" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view logs" ON "public"."workflow_logs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view mappings" ON "public"."pipeline_process_map" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view messages of their organization's conversations" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "c"."id"
   FROM "public"."conversations" "c"
  WHERE ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view org pending inputs" ON "public"."workflow_pending_inputs" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE ("om"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view org scheduled jobs" ON "public"."scheduled_workflow_jobs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own org logs" ON "public"."ai_image_generation_logs" FOR SELECT USING (("organization_id" = ( SELECT "ai_image_generation_logs"."organization_id"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payment methods of their organization" ON "public"."organization_payment_methods" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view permissions" ON "public"."workflow_permissions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view pipelines in their org" ON "public"."pipelines" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view presence of agents in their org" ON "public"."agent_presence" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_members" "my_orgs"
     JOIN "public"."organization_members" "agent_orgs" ON (("my_orgs"."organization_id" = "agent_orgs"."organization_id")))
  WHERE (("my_orgs"."user_id" = "auth"."uid"()) AND ("agent_orgs"."user_id" = "agent_presence"."user_id")))));



CREATE POLICY "Users can view process instances in their org" ON "public"."process_instances" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view process states in their org" ON "public"."process_states" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view quick_replies in their org" ON "public"."quick_replies" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view quotes in their org" ON "public"."quotes" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view reactions in their org" ON "public"."message_reactions" FOR SELECT USING (("message_id" IN ( SELECT "messages"."id"
   FROM "public"."messages"
  WHERE ("messages"."conversation_id" IN ( SELECT "conversations"."id"
           FROM "public"."conversations"
          WHERE ("conversations"."organization_id" IN ( SELECT "organization_members"."organization_id"
                   FROM "public"."organization_members"
                  WHERE ("organization_members"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view rules in their org" ON "public"."assignment_rules" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view saved_replies in their org" ON "public"."saved_replies" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view sentiment alerts for their org" ON "public"."sentiment_alerts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "sentiment_alerts"."conversation_id") AND ("c"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view shifts of their org" ON "public"."staff_shifts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view stages in their org" ON "public"."pipeline_stages" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view tags from their organization" ON "public"."crm_tags" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view tasks in their org" ON "public"."crm_tasks" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view templates in their organization" ON "public"."messaging_templates" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org campaigns" ON "public"."email_campaigns" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org notifications" ON "public"."notifications" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org routing rules" ON "public"."intent_routing_rules" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org smtp config" ON "public"."organization_smtp_configs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org templates" ON "public"."email_templates" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR ("organization_id" IS NULL)));



CREATE POLICY "Users can view their org's pipeline stages" ON "public"."pipeline_stages" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization workflows" ON "public"."workflows" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization's clients" ON "public"."clients" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_auth_org_ids"() AS "get_auth_org_ids")));



CREATE POLICY "Users can view their own briefing responses" ON "public"."briefing_responses" FOR SELECT USING (("briefing_id" IN ( SELECT "briefings"."id"
   FROM "public"."briefings"
  WHERE ("briefings"."client_id" IN ( SELECT "clients"."id"
           FROM "public"."clients"
          WHERE ("clients"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own membership" ON "public"."organization_members" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own passkeys" ON "public"."user_passkeys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view transactions of their organization" ON "public"."payment_transactions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view versions of their organization's workflows" ON "public"."workflow_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workflows" "w"
  WHERE (("w"."id" = "workflow_versions"."workflow_id") AND ("w"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view workflows in their org" ON "public"."workflows" FOR SELECT USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users delete their org catalog" ON "public"."service_catalog" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users delete their org categories" ON "public"."service_categories" FOR DELETE USING ((("scope" = 'tenant'::"text") AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users insert catalog for their org" ON "public"."service_catalog" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users insert categories for their org" ON "public"."service_categories" FOR INSERT WITH CHECK ((("scope" = 'tenant'::"text") AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users see only their org catalog" ON "public"."service_catalog" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users see only their org categories" ON "public"."service_categories" FOR SELECT USING ((("scope" = 'tenant'::"text") AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users update their org catalog" ON "public"."service_catalog" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users update their org categories" ON "public"."service_categories" FOR UPDATE USING ((("scope" = 'tenant'::"text") AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "View Campaigns" ON "public"."marketing_campaigns" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View Enrollments" ON "public"."marketing_enrollments" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View Own Settings" ON "public"."quote_settings" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View Sequences" ON "public"."marketing_sequences" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View Steps" ON "public"."marketing_steps" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View Tasks" ON "public"."crm_tasks" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View own hosting accounts" ON "public"."hosting_accounts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View staff profiles of own organization" ON "public"."staff_profiles" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "View usage logs" ON "public"."ai_usage_logs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."agent_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_availability_backup_before_sync" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_qa_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_skills_backup_before_sync" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_image_generation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignment_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignment_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_insert_only" ON "public"."automation_queue" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."automation_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "be_reseller_view_acquired" ON "public"."billable_events" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."acquired_by_reseller_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));



CREATE POLICY "be_super_admin_all" ON "public"."billable_events" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."billable_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_cycles_isolation" ON "public"."billing_cycles" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("service_id" IN ( SELECT "services"."id"
   FROM "public"."services"
  WHERE ("services"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."billing_overage_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branding_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branding_tiers_super_admin_all" ON "public"."branding_tiers" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "branding_tiers_view_active" ON "public"."branding_tiers" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."briefing_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefing_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefing_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefing_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."broadcast_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "broadcast_recipients_insert_via_broadcast" ON "public"."broadcast_recipients" FOR INSERT WITH CHECK (("broadcast_id" IN ( SELECT "broadcasts"."id"
   FROM "public"."broadcasts"
  WHERE ("broadcasts"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "broadcast_recipients_select_via_broadcast" ON "public"."broadcast_recipients" FOR SELECT USING (("broadcast_id" IN ( SELECT "broadcasts"."id"
   FROM "public"."broadcasts"
  WHERE ("broadcasts"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."broadcasts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "broadcasts_delete_own_org" ON "public"."broadcasts" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "broadcasts_insert_own_org" ON "public"."broadcasts" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "broadcasts_select_own_org" ON "public"."broadcasts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "broadcasts_update_own_org" ON "public"."broadcasts" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_isolation_policy" ON "public"."clients" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))))) WITH CHECK (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contracts_org_isolation" ON "public"."contracts" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."conversation_intents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_delete_by_org" ON "public"."conversations" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "conversations_insert_by_org" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "conversations_select_hardened" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "conversations"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND (("om"."role" = 'owner'::"text") OR ("conversations"."assigned_to" = "auth"."uid"()) OR ((("om"."permissions" -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text") OR (((("om"."permissions" -> 'modules'::"text") -> 'inbox'::"text") -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text")))))));



CREATE POLICY "conversations_update_hardened" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "conversations"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND (("om"."role" = 'owner'::"text") OR ("conversations"."assigned_to" = "auth"."uid"()) OR (("om"."permissions" -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text") OR (((("om"."permissions" -> 'modules'::"text") -> 'inbox'::"text") -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "conversations"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND (("om"."role" = 'owner'::"text") OR ("conversations"."assigned_to" = "auth"."uid"()) OR (("om"."permissions" -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text") OR (((("om"."permissions" -> 'modules'::"text") -> 'inbox'::"text") -> 'inbox_access'::"text") ? ("conversations"."connection_id")::"text"))))));



ALTER TABLE "public"."crm_lead_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deal_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dian_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."domain_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emitters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "emitters_isolation_policy" ON "public"."emitters" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))))) WITH CHECK (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_flags_admin_write" ON "public"."feature_flags" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "feature_flags"."organization_id") AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "feature_flags_read_own_org" ON "public"."feature_flags" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."global_dashboard_banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hosting_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "integration_connections_manage_admins" ON "public"."integration_connections" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "integration_connections_view_members" ON "public"."integration_connections" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."integration_providers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "integration_providers_admin_all" ON "public"."integration_providers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "integration_providers_read_all" ON "public"."integration_providers" FOR SELECT TO "authenticated" USING (("is_enabled" = true));



ALTER TABLE "public"."intent_routing_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_isolation_policy" ON "public"."invoices" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE ("organization_members"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifecycle_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manage_org_roles_delete" ON "public"."organization_roles" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "member"."organization_id"
   FROM ("public"."organization_members" "member"
     LEFT JOIN "public"."organization_roles" "role" ON (("member"."role_id" = "role"."id")))
  WHERE (("member"."user_id" = "auth"."uid"()) AND (("member"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR (("role"."is_system_role" = true) AND ("role"."name" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Dueño'::"text", 'Administrador'::"text"]))))))));



CREATE POLICY "manage_org_roles_update" ON "public"."organization_roles" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "member"."organization_id"
   FROM ("public"."organization_members" "member"
     LEFT JOIN "public"."organization_roles" "role" ON (("member"."role_id" = "role"."id")))
  WHERE (("member"."user_id" = "auth"."uid"()) AND (("member"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR (("role"."is_system_role" = true) AND ("role"."name" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Dueño'::"text", 'Administrador'::"text"]))))))));



CREATE POLICY "manage_org_roles_write" ON "public"."organization_roles" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "member"."organization_id"
   FROM ("public"."organization_members" "member"
     LEFT JOIN "public"."organization_roles" "role" ON (("member"."role_id" = "role"."id")))
  WHERE (("member"."user_id" = "auth"."uid"()) AND (("member"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR (("role"."is_system_role" = true) AND ("role"."name" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Dueño'::"text", 'Administrador'::"text"]))))))));



ALTER TABLE "public"."manifest_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manifest_imeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_audiences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete_by_org" ON "public"."messages" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."organization_members" "om" ON (("c"."organization_id" = "om"."organization_id")))
  WHERE (("c"."id" = "messages"."conversation_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "messages_insert_by_org" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."organization_members" "om" ON (("c"."organization_id" = "om"."organization_id")))
  WHERE (("c"."id" = "messages"."conversation_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "messages_insert_policy_optimized" ON "public"."messages" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "messages_select_hardened" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE ("c"."id" = "messages"."conversation_id"))));



CREATE POLICY "messages_select_policy_optimized" ON "public"."messages" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "messages_update_by_org" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."organization_members" "om" ON (("c"."organization_id" = "om"."organization_id")))
  WHERE (("c"."id" = "messages"."conversation_id") AND ("om"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."organization_members" "om" ON (("c"."organization_id" = "om"."organization_id")))
  WHERE (("c"."id" = "messages"."conversation_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "messages_update_policy_optimized" ON "public"."messages" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."messaging_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meta_ads_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meta_org_ads_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meta_social_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_read_policy" ON "public"."system_modules" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_add_ons_view_own" ON "public"."organization_add_ons" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_saas_isolation" ON "public"."organization_saas_products" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."organization_add_ons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_billing_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_saas_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_smtp_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_isolation_policy" ON "public"."organizations" USING (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))))) WITH CHECK (((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text") OR ("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "pa_org_admin_own" ON "public"."payment_accounts" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "pa_super_admin_all" ON "public"."payment_accounts" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."passkey_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_config_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateway_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_process_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_limit_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ral_reseller_manage_own" ON "public"."reseller_activity_log" TO "authenticated" USING (("reseller_org_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("reseller_org_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "ral_super_admin_all" ON "public"."reseller_activity_log" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."reseller_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resto_table_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resto_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resto_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenue_share_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rsr_reseller_view_own" ON "public"."revenue_share_rules" FOR SELECT TO "authenticated" USING ((("reseller_org_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) OR ("reseller_org_id" IS NULL)));



CREATE POLICY "rsr_super_admin_all" ON "public"."revenue_share_rules" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."saas_app_add_ons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saas_app_add_ons_super_admin_all" ON "public"."saas_app_add_ons" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "saas_app_add_ons_view" ON "public"."saas_app_add_ons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."saas_apps"
  WHERE (("saas_apps"."id" = "saas_app_add_ons"."app_id") AND ("saas_apps"."is_active" = true)))));



ALTER TABLE "public"."saas_app_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saas_app_modules_super_admin_all" ON "public"."saas_app_modules" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "saas_app_modules_view" ON "public"."saas_app_modules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."saas_apps"
  WHERE (("saas_apps"."id" = "saas_app_modules"."app_id") AND ("saas_apps"."is_active" = true)))));



ALTER TABLE "public"."saas_apps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_apps_portal_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saas_apps_super_admin_all" ON "public"."saas_apps" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



CREATE POLICY "saas_apps_view_active" ON "public"."saas_apps" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."saas_platform_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_product_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_product_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_replies_delete_by_org" ON "public"."saved_replies" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "saved_replies_insert_by_org" ON "public"."saved_replies" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "saved_replies_select_by_org" ON "public"."saved_replies" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "saved_replies_update_by_org" ON "public"."saved_replies" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."scheduled_workflow_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sentiment_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access" ON "public"."automation_queue" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "set_reseller_view_own" ON "public"."settlements" FOR SELECT TO "authenticated" USING (("reseller_org_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "set_super_admin_all" ON "public"."settlements" TO "authenticated" USING ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'platform_role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_payroll_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_payroll_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_work_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_modules_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_passkeys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vertical_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verticals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_org_roles" ON "public"."organization_roles" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "view_service_catalog" ON "public"."service_catalog" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_pending_inputs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clients";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."leads";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_app_to_organization"("p_organization_id" "uuid", "p_app_id" "text", "p_enable_optional_modules" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_resolve_dependencies"("p_module_key" "text", "p_current_active_modules" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_audit_hash"("p_id" "uuid", "p_timestamp" timestamp with time zone, "p_action" "text", "p_document_id" "uuid", "p_organization_id" "uuid", "p_previous_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_audit_hash"("p_id" "uuid", "p_timestamp" timestamp with time zone, "p_action" "text", "p_document_id" "uuid", "p_organization_id" "uuid", "p_previous_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_audit_hash"("p_id" "uuid", "p_timestamp" timestamp with time zone, "p_action" "text", "p_document_id" "uuid", "p_organization_id" "uuid", "p_previous_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_cart_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_cart_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_cart_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_event_commission"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_org_storage"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_org_storage"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_org_storage"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_period_totals"("period_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_period_totals"("period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_period_totals"("period_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_invoices_on_service_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_invoices_on_service_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_invoices_on_service_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_member_module_access"("p_org_id" "uuid", "p_user_id" "uuid", "p_module" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_member_module_access"("p_org_id" "uuid", "p_user_id" "uuid", "p_module" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_member_module_access"("p_org_id" "uuid", "p_user_id" "uuid", "p_module" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_member_permission"("p_org_id" "uuid", "p_user_id" "uuid", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_member_permission"("p_org_id" "uuid", "p_user_id" "uuid", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_member_permission"("p_org_id" "uuid", "p_user_id" "uuid", "p_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_storage_limit"("p_organization_id" "uuid", "p_file_size_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_workflow_permission"("p_workflow_id" "uuid", "p_user_id" "uuid", "p_required_role" "public"."workflow_role") TO "anon";
GRANT ALL ON FUNCTION "public"."check_workflow_permission"("p_workflow_id" "uuid", "p_user_id" "uuid", "p_required_role" "public"."workflow_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_workflow_permission"("p_workflow_id" "uuid", "p_user_id" "uuid", "p_required_role" "public"."workflow_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_passkey_challenges"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_passkey_challenges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_passkey_challenges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphan_organizations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphan_organizations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphan_organizations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_portal_access_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_portal_access_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_portal_access_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_marketing_audience"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_marketing_audience"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_marketing_audience"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_marketing_audience_v2"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_marketing_audience_v2"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_marketing_audience_v2"("_organization_id" "uuid", "_name" "text", "_description" "text", "_filter_config" "jsonb", "_cached_count" integer, "_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_scheduled_deletions"() TO "anon";
GRANT ALL ON FUNCTION "public"."execute_scheduled_deletions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_scheduled_deletions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_conversation_by_phone"("p_phone" "text", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."find_conversation_by_phone"("p_phone" "text", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_conversation_by_phone"("p_phone" "text", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_next_agent_atomic"("p_org_id" "uuid", "p_strategy" character varying, "p_agent_pool" "uuid"[], "p_channel_type" character varying, "p_connection_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_next_agent_atomic"("p_org_id" "uuid", "p_strategy" character varying, "p_agent_pool" "uuid"[], "p_channel_type" character varying, "p_connection_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_next_agent_atomic"("p_org_id" "uuid", "p_strategy" character varying, "p_agent_pool" "uuid"[], "p_channel_type" character varying, "p_connection_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_recalculate_agent_load"("p_agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recalculate_agent_load"("p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recalculate_agent_load"("p_agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_agent_load_on_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_agent_load_on_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_agent_load_on_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_saas_platform_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_saas_platform_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_saas_platform_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_short_token"("length" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_short_token"("length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_token"("length" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_payment_gateway"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_payment_gateway"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_payment_gateway"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_advanced_crm_reports"("p_org_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_advanced_crm_reports"("p_org_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_advanced_crm_reports"("p_org_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agency_dashboard_metrics"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agency_dashboard_metrics"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agency_dashboard_metrics"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_monitoring_stats"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_monitoring_stats"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_monitoring_stats"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_org_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_briefing_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_briefing_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_briefing_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON TABLE "public"."briefing_responses" TO "anon";
GRANT ALL ON TABLE "public"."briefing_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."briefing_responses" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_briefing_responses"("p_briefing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_briefing_responses"("p_briefing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_briefing_responses"("p_briefing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_by_short_token"("token_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_by_short_token"("token_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_by_short_token"("token_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_by_token"("token_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_by_token"("token_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_by_token"("token_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_content_text"("content" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_content_text"("content" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_content_text"("content" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expiring_trials"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_trials"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_trials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("org_id" "uuid", "entity_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("org_id" "uuid", "entity_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("org_id" "uuid", "entity_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_modules_with_fallback"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_modules_with_fallback"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_modules_with_fallback"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_storage_limit"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_storage_limit"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_storage_limit"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orphaned_modules"("p_module_to_disable" "text", "p_current_active_modules" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_paginated_clients"("p_org_id" "uuid", "p_search" "text", "p_status" "text", "p_page" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_paginated_clients"("p_org_id" "uuid", "p_search" "text", "p_status" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paginated_clients"("p_org_id" "uuid", "p_search" "text", "p_status" "text", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_contact_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_contact_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paginated_leads"("p_org_id" "uuid", "p_search" "text", "p_stage_id" "text", "p_connection_ids" "uuid"[], "p_user_id" "uuid", "p_page" integer, "p_page_size" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_contact_type" "text") TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_workflow_jobs" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_workflow_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_workflow_jobs" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_scheduled_jobs"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_scheduled_jobs"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_scheduled_jobs"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_templates_for_vertical"("p_vertical" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_message_unsnooze"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_message_unsnooze"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_message_unsnooze"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_org_member_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_org_member_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_org_member_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_storage_usage"("p_organization_id" "uuid", "p_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_usage"("p_organization_id" "uuid", "p_engine" "text", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_usage"("p_organization_id" "uuid", "p_engine" "text", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_usage"("p_organization_id" "uuid", "p_engine" "text", "p_quantity" integer) TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON FUNCTION "public"."is_portal_token_valid"("client_row" "public"."clients") TO "anon";
GRANT ALL ON FUNCTION "public"."is_portal_token_valid"("client_row" "public"."clients") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_portal_token_valid"("client_row" "public"."clients") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_agent_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_agent_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_agent_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_payment_config_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_payment_config_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_payment_config_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "service_role";












GRANT ALL ON FUNCTION "public"."process_trial_expirations"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_trial_expirations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_trial_expirations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_acquisition_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_acquisition_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_acquisition_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_dian_evidence"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_dian_evidence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_dian_evidence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_limits"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_limits"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_limits"("target_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_org_limits"("p_organization_id" "uuid", "p_plan_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reconcile_agent_loads"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reconcile_agent_loads"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_agent_loads"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_org_activity"("p_organization_id" "uuid", "p_activity_type" "text", "p_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."record_org_activity"("p_organization_id" "uuid", "p_activity_type" "text", "p_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_org_activity"("p_organization_id" "uuid", "p_activity_type" "text", "p_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_briefing_response"("p_briefing_id" "uuid", "p_field_id" "uuid", "p_value" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_briefing_response"("p_briefing_id" "uuid", "p_field_id" "uuid", "p_value" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_briefing_response"("p_briefing_id" "uuid", "p_field_id" "uuid", "p_value" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_audit_hash"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_audit_hash"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_audit_hash"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_conversation_bot_status"("conv_id" "uuid", "bot_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_conversation_bot_status"("conv_id" "uuid", "bot_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_conversation_bot_status"("conv_id" "uuid", "bot_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_message_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_message_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_message_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_trial_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_trial_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_trial_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_usage_parent_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_usage_parent_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_usage_parent_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_briefing"("p_briefing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_briefing"("p_briefing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_briefing"("p_briefing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions_by_data"("p_org_id" "uuid", "p_user_id" "uuid", "p_permissions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions_by_data"("p_org_id" "uuid", "p_user_id" "uuid", "p_permissions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_agent_channels_from_permissions_by_data"("p_org_id" "uuid", "p_user_id" "uuid", "p_permissions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_conversation_assignment_to_lead"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_conversation_assignment_to_lead"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_conversation_assignment_to_lead"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_lead_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_lead_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_lead_value"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_member_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_member_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_member_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_quote_to_lead"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_quote_to_lead"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_quote_to_lead"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_provision_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_provision_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_provision_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_provision_org_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_provision_org_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_provision_org_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_briefing_response_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_briefing_response_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_briefing_response_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contract_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contract_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contract_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pipeline_stages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pipeline_stages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pipeline_stages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scheduled_job_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_scheduled_job_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scheduled_job_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_settlement_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settlement_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settlement_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_branding_tier"("p_organization_id" "uuid", "p_new_tier_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_org_plan"("p_organization_id" "uuid", "p_new_plan_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_module_activation"("p_module_key" "text", "p_organization_id" "uuid", "p_current_active_modules" "text"[]) TO "service_role";






























GRANT ALL ON TABLE "public"."agent_availability" TO "anon";
GRANT ALL ON TABLE "public"."agent_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_availability" TO "service_role";



GRANT ALL ON TABLE "public"."agent_availability_backup_before_sync" TO "anon";
GRANT ALL ON TABLE "public"."agent_availability_backup_before_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_availability_backup_before_sync" TO "service_role";



GRANT ALL ON TABLE "public"."agent_channels" TO "anon";
GRANT ALL ON TABLE "public"."agent_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_channels" TO "service_role";



GRANT ALL ON TABLE "public"."agent_presence" TO "anon";
GRANT ALL ON TABLE "public"."agent_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_presence" TO "service_role";



GRANT ALL ON TABLE "public"."agent_qa_reports" TO "anon";
GRANT ALL ON TABLE "public"."agent_qa_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_qa_reports" TO "service_role";



GRANT ALL ON TABLE "public"."agent_skills" TO "anon";
GRANT ALL ON TABLE "public"."agent_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_skills" TO "service_role";



GRANT ALL ON TABLE "public"."agent_skills_backup_before_sync" TO "anon";
GRANT ALL ON TABLE "public"."agent_skills_backup_before_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_skills_backup_before_sync" TO "service_role";



GRANT ALL ON TABLE "public"."agent_status_history" TO "anon";
GRANT ALL ON TABLE "public"."agent_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."ai_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_cache" TO "service_role";



GRANT ALL ON TABLE "public"."ai_credentials" TO "anon";
GRANT ALL ON TABLE "public"."ai_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."ai_image_generation_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_image_generation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_image_generation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers" TO "service_role";



GRANT ALL ON TABLE "public"."ai_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestion_analytics" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestion_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestion_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."usage_events" TO "anon";
GRANT ALL ON TABLE "public"."usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_daily_usage" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily_usage" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_history" TO "anon";
GRANT ALL ON TABLE "public"."assignment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_history" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_rules" TO "anon";
GRANT ALL ON TABLE "public"."assignment_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_rules" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_logs" TO "anon";
GRANT ALL ON TABLE "public"."attendance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_shifts" TO "anon";
GRANT ALL ON TABLE "public"."attendance_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."automation_queue" TO "anon";
GRANT ALL ON TABLE "public"."automation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_queue" TO "service_role";



GRANT ALL ON TABLE "public"."billable_events" TO "anon";
GRANT ALL ON TABLE "public"."billable_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billable_events" TO "service_role";



GRANT ALL ON TABLE "public"."billing_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."billing_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."billing_cycles" TO "anon";
GRANT ALL ON TABLE "public"."billing_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."billing_overage_rates" TO "anon";
GRANT ALL ON TABLE "public"."billing_overage_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_overage_rates" TO "service_role";



GRANT ALL ON TABLE "public"."billing_packages" TO "anon";
GRANT ALL ON TABLE "public"."billing_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_packages" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."branding_tiers" TO "anon";
GRANT ALL ON TABLE "public"."branding_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."branding_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."briefing_fields" TO "anon";
GRANT ALL ON TABLE "public"."briefing_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."briefing_fields" TO "service_role";



GRANT ALL ON TABLE "public"."briefing_steps" TO "anon";
GRANT ALL ON TABLE "public"."briefing_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."briefing_steps" TO "service_role";



GRANT ALL ON TABLE "public"."briefing_templates" TO "anon";
GRANT ALL ON TABLE "public"."briefing_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."briefing_templates" TO "service_role";



GRANT ALL ON TABLE "public"."briefings" TO "anon";
GRANT ALL ON TABLE "public"."briefings" TO "authenticated";
GRANT ALL ON TABLE "public"."briefings" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_recipients" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcasts" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."channel_definitions" TO "anon";
GRANT ALL ON TABLE "public"."channel_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."client_categories" TO "anon";
GRANT ALL ON TABLE "public"."client_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."client_categories" TO "service_role";



GRANT ALL ON TABLE "public"."client_events" TO "anon";
GRANT ALL ON TABLE "public"."client_events" TO "authenticated";
GRANT ALL ON TABLE "public"."client_events" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_intents" TO "anon";
GRANT ALL ON TABLE "public"."conversation_intents" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_intents" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."crm_lead_tags" TO "anon";
GRANT ALL ON TABLE "public"."crm_lead_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_lead_tags" TO "service_role";



GRANT ALL ON TABLE "public"."crm_tags" TO "anon";
GRANT ALL ON TABLE "public"."crm_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_tags" TO "service_role";



GRANT ALL ON TABLE "public"."crm_tasks" TO "anon";
GRANT ALL ON TABLE "public"."crm_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."data_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."data_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."data_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."deal_carts" TO "anon";
GRANT ALL ON TABLE "public"."deal_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_carts" TO "service_role";



GRANT ALL ON TABLE "public"."dian_documents" TO "anon";
GRANT ALL ON TABLE "public"."dian_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."dian_documents" TO "service_role";



GRANT ALL ON TABLE "public"."domain_events" TO "anon";
GRANT ALL ON TABLE "public"."domain_events" TO "authenticated";
GRANT ALL ON TABLE "public"."domain_events" TO "service_role";



GRANT ALL ON TABLE "public"."email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."emitters" TO "anon";
GRANT ALL ON TABLE "public"."emitters" TO "authenticated";
GRANT ALL ON TABLE "public"."emitters" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."global_dashboard_banners" TO "anon";
GRANT ALL ON TABLE "public"."global_dashboard_banners" TO "authenticated";
GRANT ALL ON TABLE "public"."global_dashboard_banners" TO "service_role";



GRANT ALL ON TABLE "public"."hosting_accounts" TO "anon";
GRANT ALL ON TABLE "public"."hosting_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."hosting_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."integration_configs" TO "anon";
GRANT ALL ON TABLE "public"."integration_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_configs" TO "service_role";



GRANT ALL ON TABLE "public"."integration_connections" TO "anon";
GRANT ALL ON TABLE "public"."integration_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_connections" TO "service_role";



GRANT ALL ON TABLE "public"."integration_providers" TO "anon";
GRANT ALL ON TABLE "public"."integration_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_providers" TO "service_role";



GRANT ALL ON TABLE "public"."intent_routing_rules" TO "anon";
GRANT ALL ON TABLE "public"."intent_routing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."intent_routing_rules" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."lifecycle_notifications" TO "anon";
GRANT ALL ON TABLE "public"."lifecycle_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."lifecycle_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."manifest_documents" TO "anon";
GRANT ALL ON TABLE "public"."manifest_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."manifest_documents" TO "service_role";



GRANT ALL ON TABLE "public"."manifest_imeis" TO "anon";
GRANT ALL ON TABLE "public"."manifest_imeis" TO "authenticated";
GRANT ALL ON TABLE "public"."manifest_imeis" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_audiences" TO "anon";
GRANT ALL ON TABLE "public"."marketing_audiences" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_audiences" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."marketing_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_sequences" TO "anon";
GRANT ALL ON TABLE "public"."marketing_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_steps" TO "anon";
GRANT ALL ON TABLE "public"."marketing_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_steps" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."messaging_templates" TO "anon";
GRANT ALL ON TABLE "public"."messaging_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."messaging_templates" TO "service_role";



GRANT ALL ON TABLE "public"."meta_ads_metrics" TO "anon";
GRANT ALL ON TABLE "public"."meta_ads_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."meta_ads_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."meta_org_ads_metrics" TO "anon";
GRANT ALL ON TABLE "public"."meta_org_ads_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."meta_org_ads_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."meta_social_metrics" TO "anon";
GRANT ALL ON TABLE "public"."meta_social_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."meta_social_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_add_ons" TO "anon";
GRANT ALL ON TABLE "public"."organization_add_ons" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_add_ons" TO "service_role";



GRANT ALL ON TABLE "public"."organization_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."organization_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."organization_billing_profiles" TO "anon";
GRANT ALL ON TABLE "public"."organization_billing_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_billing_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_health_scores" TO "anon";
GRANT ALL ON TABLE "public"."organization_health_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_health_scores" TO "service_role";



GRANT ALL ON TABLE "public"."organization_locations" TO "anon";
GRANT ALL ON TABLE "public"."organization_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_locations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organization_modules" TO "anon";
GRANT ALL ON TABLE "public"."organization_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_modules" TO "service_role";



GRANT ALL ON TABLE "public"."organization_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."organization_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."organization_roles" TO "anon";
GRANT ALL ON TABLE "public"."organization_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_roles" TO "service_role";



GRANT ALL ON TABLE "public"."organization_saas_products" TO "anon";
GRANT ALL ON TABLE "public"."organization_saas_products" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_saas_products" TO "service_role";



GRANT ALL ON TABLE "public"."organization_sequences" TO "anon";
GRANT ALL ON TABLE "public"."organization_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."organization_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organization_smtp_configs" TO "anon";
GRANT ALL ON TABLE "public"."organization_smtp_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_smtp_configs" TO "service_role";



GRANT ALL ON TABLE "public"."organization_staff" TO "anon";
GRANT ALL ON TABLE "public"."organization_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_staff" TO "service_role";



GRANT ALL ON TABLE "public"."passkey_challenges" TO "anon";
GRANT ALL ON TABLE "public"."passkey_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."passkey_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."payment_accounts" TO "anon";
GRANT ALL ON TABLE "public"."payment_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_config_audit" TO "anon";
GRANT ALL ON TABLE "public"."payment_config_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_config_audit" TO "service_role";



GRANT ALL ON TABLE "public"."payment_gateway_config" TO "anon";
GRANT ALL ON TABLE "public"."payment_gateway_config" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_gateway_config" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_process_map" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_process_map" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_process_map" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."pipelines" TO "anon";
GRANT ALL ON TABLE "public"."pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."pipelines" TO "service_role";



GRANT ALL ON TABLE "public"."plan_limit_definitions" TO "anon";
GRANT ALL ON TABLE "public"."plan_limit_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_limit_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."plan_templates" TO "anon";
GRANT ALL ON TABLE "public"."plan_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_templates" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."platform_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."platform_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."platform_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."portal_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."portal_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."saas_apps" TO "anon";
GRANT ALL ON TABLE "public"."saas_apps" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_apps" TO "service_role";



GRANT ALL ON TABLE "public"."saas_apps_portal_config" TO "anon";
GRANT ALL ON TABLE "public"."saas_apps_portal_config" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_apps_portal_config" TO "service_role";



GRANT ALL ON TABLE "public"."portal_modules_by_app" TO "anon";
GRANT ALL ON TABLE "public"."portal_modules_by_app" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_modules_by_app" TO "service_role";



GRANT ALL ON TABLE "public"."process_instances" TO "anon";
GRANT ALL ON TABLE "public"."process_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."process_instances" TO "service_role";



GRANT ALL ON TABLE "public"."process_states" TO "anon";
GRANT ALL ON TABLE "public"."process_states" TO "authenticated";
GRANT ALL ON TABLE "public"."process_states" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quick_replies" TO "anon";
GRANT ALL ON TABLE "public"."quick_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_replies" TO "service_role";



GRANT ALL ON TABLE "public"."quote_settings" TO "anon";
GRANT ALL ON TABLE "public"."quote_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_settings" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."reseller_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."reseller_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."resto_table_sessions" TO "anon";
GRANT ALL ON TABLE "public"."resto_table_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."resto_table_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."resto_tables" TO "anon";
GRANT ALL ON TABLE "public"."resto_tables" TO "authenticated";
GRANT ALL ON TABLE "public"."resto_tables" TO "service_role";



GRANT ALL ON TABLE "public"."resto_zones" TO "anon";
GRANT ALL ON TABLE "public"."resto_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."resto_zones" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_share_rules" TO "anon";
GRANT ALL ON TABLE "public"."revenue_share_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_share_rules" TO "service_role";



GRANT ALL ON TABLE "public"."saas_app_add_ons" TO "anon";
GRANT ALL ON TABLE "public"."saas_app_add_ons" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_app_add_ons" TO "service_role";



GRANT ALL ON TABLE "public"."saas_app_modules" TO "anon";
GRANT ALL ON TABLE "public"."saas_app_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_app_modules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."saas_platform_invoice_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."saas_platform_invoice_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."saas_platform_invoice_seq" TO "service_role";



GRANT ALL ON TABLE "public"."saas_platform_invoices" TO "anon";
GRANT ALL ON TABLE "public"."saas_platform_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_platform_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."saas_product_modules" TO "anon";
GRANT ALL ON TABLE "public"."saas_product_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_product_modules" TO "service_role";



GRANT ALL ON TABLE "public"."saas_product_packages" TO "anon";
GRANT ALL ON TABLE "public"."saas_product_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_product_packages" TO "service_role";



GRANT ALL ON TABLE "public"."saas_products" TO "anon";
GRANT ALL ON TABLE "public"."saas_products" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_products" TO "service_role";



GRANT ALL ON TABLE "public"."saas_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."saas_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."saved_replies" TO "anon";
GRANT ALL ON TABLE "public"."saved_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_replies" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."sentiment_alerts" TO "anon";
GRANT ALL ON TABLE "public"."sentiment_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."sentiment_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."sentiment_analytics" TO "anon";
GRANT ALL ON TABLE "public"."sentiment_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."sentiment_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."service_catalog" TO "anon";
GRANT ALL ON TABLE "public"."service_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."service_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."service_categories" TO "anon";
GRANT ALL ON TABLE "public"."service_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."service_categories" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."settlements" TO "anon";
GRANT ALL ON TABLE "public"."settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlements" TO "service_role";



GRANT ALL ON TABLE "public"."staff_payments" TO "anon";
GRANT ALL ON TABLE "public"."staff_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_payments" TO "service_role";



GRANT ALL ON TABLE "public"."staff_payroll_periods" TO "anon";
GRANT ALL ON TABLE "public"."staff_payroll_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_payroll_periods" TO "service_role";



GRANT ALL ON TABLE "public"."staff_payroll_settlements" TO "anon";
GRANT ALL ON TABLE "public"."staff_payroll_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_payroll_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."staff_profiles" TO "anon";
GRANT ALL ON TABLE "public"."staff_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."staff_shifts" TO "anon";
GRANT ALL ON TABLE "public"."staff_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."staff_work_logs" TO "anon";
GRANT ALL ON TABLE "public"."staff_work_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_work_logs" TO "service_role";



GRANT ALL ON TABLE "public"."storage_usage" TO "anon";
GRANT ALL ON TABLE "public"."storage_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_usage" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."system_alerts" TO "anon";
GRANT ALL ON TABLE "public"."system_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."system_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."system_modules" TO "anon";
GRANT ALL ON TABLE "public"."system_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."system_modules" TO "service_role";



GRANT ALL ON TABLE "public"."system_modules_registry" TO "anon";
GRANT ALL ON TABLE "public"."system_modules_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."system_modules_registry" TO "service_role";



GRANT ALL ON TABLE "public"."usage_counters" TO "anon";
GRANT ALL ON TABLE "public"."usage_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_counters" TO "service_role";



GRANT ALL ON TABLE "public"."usage_limits" TO "anon";
GRANT ALL ON TABLE "public"."usage_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_limits" TO "service_role";



GRANT ALL ON TABLE "public"."system_usage_alerts" TO "anon";
GRANT ALL ON TABLE "public"."system_usage_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."system_usage_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."user_passkeys" TO "anon";
GRANT ALL ON TABLE "public"."user_passkeys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_passkeys" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."v_clients" TO "anon";
GRANT ALL ON TABLE "public"."v_clients" TO "authenticated";
GRANT ALL ON TABLE "public"."v_clients" TO "service_role";



GRANT ALL ON TABLE "public"."v_organization_templates" TO "anon";
GRANT ALL ON TABLE "public"."v_organization_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."v_organization_templates" TO "service_role";



GRANT ALL ON TABLE "public"."v_template_modules" TO "anon";
GRANT ALL ON TABLE "public"."v_template_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."v_template_modules" TO "service_role";



GRANT ALL ON TABLE "public"."vertical_modules" TO "anon";
GRANT ALL ON TABLE "public"."vertical_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."vertical_modules" TO "service_role";



GRANT ALL ON TABLE "public"."verticals" TO "anon";
GRANT ALL ON TABLE "public"."verticals" TO "authenticated";
GRANT ALL ON TABLE "public"."verticals" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_executions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_executions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_logs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_pending_inputs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_pending_inputs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_pending_inputs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_permissions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_versions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_versions" TO "service_role";



GRANT ALL ON TABLE "public"."workflows" TO "anon";
GRANT ALL ON TABLE "public"."workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."workflows" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































