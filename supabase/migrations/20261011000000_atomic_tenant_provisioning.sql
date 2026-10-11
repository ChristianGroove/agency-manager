-- Core provisioning and invite consumption must commit together. External Auth
-- account creation/email delivery are retriable side effects, never DB commits.
BEGIN;

-- The baseline assigned text[] into a jsonb column. Keep the shared assignment
-- RPC compatible with the actual schema and the archived vertical-key fix.
CREATE OR REPLACE FUNCTION public.assign_app_to_organization(
    p_organization_id uuid, p_app_id text, p_enable_optional_modules boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app saas_apps; v_modules jsonb; v_vertical text;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' AND NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND lower(replace(platform_role,'_','')) = 'superadmin'
    ) THEN RAISE EXCEPTION 'No tienes permiso para asignar espacios'; END IF;
    SELECT * INTO v_app FROM saas_apps WHERE id = p_app_id AND is_active;
    IF NOT FOUND THEN RETURN '{"success":false,"error":"App not found or inactive"}'::jsonb; END IF;
    v_vertical := CASE coalesce(v_app.space_category,v_app.category)
        WHEN 'ecommerce' THEN 'retail'
        WHEN 'real_estate' THEN 'real_estate'
        WHEN 'agency' THEN 'agency' WHEN 'resto' THEN 'resto' WHEN 'cleaning' THEN 'cleaning'
        WHEN 'retail' THEN 'retail' WHEN 'saas' THEN 'saas' WHEN 'platform' THEN 'platform' ELSE 'agency' END;
    SELECT coalesce(jsonb_agg(module_key ORDER BY sort_order),'[]') INTO v_modules FROM saas_app_modules
        WHERE app_id = p_app_id AND (auto_enable OR (is_optional AND p_enable_optional_modules));
    UPDATE organizations SET active_app_id = p_app_id, app_activated_at = now(), updated_at = now(),
        vertical_key = v_vertical, manual_module_overrides = v_modules WHERE id = p_organization_id;
    IF NOT FOUND THEN RETURN '{"success":false,"error":"Organization not found"}'::jsonb; END IF;
    RETURN jsonb_build_object('success',true,'app_id',p_app_id,'app_name',v_app.name,'vertical_key',v_vertical,'modules_enabled',v_modules);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_app_to_organization(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_app_to_organization(uuid,text,boolean) TO authenticated, service_role;

CREATE TABLE public.tenant_provisioning_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES auth.users(id),
    request_key text NOT NULL,
    organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    input jsonb NOT NULL,
    invite_id uuid REFERENCES public.platform_access_invitations(id),
    recipient_email text,
    activation_status text NOT NULL DEFAULT 'pending' CHECK (activation_status IN ('pending','sending','sent','failed')),
    activation_claim_id uuid,
    activation_attempted_at timestamptz,
    activation_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (actor_id, request_key)
);
CREATE UNIQUE INDEX tenant_onboarding_once_per_user ON public.tenant_provisioning_requests(actor_id) WHERE invite_id IS NOT NULL;
ALTER TABLE public.tenant_provisioning_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_provisioning_requests FROM anon, authenticated;
GRANT ALL ON public.tenant_provisioning_requests TO service_role;

-- Validation/management use authorized server actions. Neither invitation lists
-- nor mutable usage counters should be exposed through the public Data API.
DROP POLICY IF EXISTS org_members_manage_access_invitations ON public.platform_access_invitations;
DROP POLICY IF EXISTS public_read_active_access_invitations ON public.platform_access_invitations;
REVOKE ALL ON public.platform_access_invitations FROM anon, authenticated;
GRANT ALL ON public.platform_access_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.provision_tenant_atomic(
    p_actor_id uuid, p_request_key text, p_input jsonb,
    p_owner_id uuid, p_invite_code text, p_defaults jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_org public.organizations;
    v_request public.tenant_provisioning_requests;
    v_invite public.platform_access_invitations;
    v_user auth.users;
    v_parent uuid;
    v_reseller uuid;
    v_type text := coalesce(p_input->>'organization_type', 'client');
    v_owner uuid := p_owner_id;
    v_assignment jsonb;
    v_product uuid;
    v_row jsonb;
    v_pipeline uuid;
    v_stage uuid;
    v_order integer := 0;
    v_privileged boolean;
BEGIN
    IF p_actor_id IS NULL OR coalesce(p_request_key,'') = '' OR length(p_request_key) > 200 THEN
        RAISE EXCEPTION 'Solicitud de alta inválida';
    END IF;
    -- Serialize requests by actor, including different tabs/keys in onboarding.
    PERFORM pg_advisory_xact_lock(hashtextextended('tenant-provision:' || p_actor_id::text, 0));
    SELECT * INTO v_request FROM tenant_provisioning_requests
        WHERE actor_id = p_actor_id AND (request_key = p_request_key OR (p_invite_code IS NOT NULL AND invite_id IS NOT NULL));
    IF FOUND THEN
        IF v_request.invite_id IS NULL AND v_request.input IS DISTINCT FROM p_input THEN
            RAISE EXCEPTION 'La solicitud ya fue utilizada con otros datos';
        END IF;
        SELECT * INTO STRICT v_org FROM organizations WHERE id = v_request.organization_id;
        RETURN jsonb_build_object('organization', to_jsonb(v_org), 'reused', true);
    END IF;
    SELECT * INTO STRICT v_user FROM auth.users WHERE id = p_actor_id;
    IF nullif(trim(p_input->>'name'),'') IS NULL OR coalesce(p_input->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'Nombre o identificador inválido';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM saas_apps WHERE id = p_input->>'app_id' AND is_active) THEN
        RAISE EXCEPTION 'El espacio seleccionado no está disponible';
    END IF;
    v_privileged := EXISTS (SELECT 1 FROM profiles WHERE id = p_actor_id AND lower(replace(platform_role,'_','')) = 'superadmin');
    v_parent := nullif(p_input->>'parent_organization_id','')::uuid;
    v_reseller := nullif(p_input->>'acquired_by_reseller_id','')::uuid;

    IF p_invite_code IS NOT NULL THEN
        -- Always revalidate under the row lock; preflight validation is only UX.
        SELECT * INTO v_invite FROM platform_access_invitations WHERE code = upper(trim(p_invite_code)) FOR UPDATE;
        IF NOT FOUND OR v_invite.status <> 'active' OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now())
            OR (v_invite.max_uses > 0 AND v_invite.uses_count >= v_invite.max_uses) THEN
            RAISE EXCEPTION 'La invitación expiró o agotó sus usos';
        END IF;
        IF upper(coalesce(v_user.raw_app_meta_data->>'onboarding_invite_code', v_user.raw_user_meta_data->>'invited_by_code', '')) <> v_invite.code
            OR (nullif(trim(v_invite.recipient_email),'') IS NOT NULL AND lower(trim(v_invite.recipient_email)) <> lower(v_user.email)) THEN
            RAISE EXCEPTION 'Esta invitación no corresponde a tu cuenta';
        END IF;
        IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = p_actor_id AND deleted_at IS NULL
            AND (status = 'blocked' OR NOT coalesce((permissions->>'is_support_proxy')::boolean,false))) THEN
            RAISE EXCEPTION 'Tu cuenta ya tiene una organización. Recarga para activar el acceso existente';
        END IF;
        v_owner := p_actor_id;
        v_type := CASE WHEN v_invite.target_organization_type = 'reseller' THEN 'reseller' ELSE 'client' END;
        v_parent := v_invite.reseller_org_id;
        v_reseller := v_invite.reseller_org_id;
    ELSIF NOT v_privileged THEN
        IF v_type <> 'client' OR v_parent IS NULL OR v_reseller IS DISTINCT FROM v_parent OR NOT EXISTS (
            SELECT 1 FROM organization_members m JOIN organizations o ON o.id = m.organization_id
            WHERE m.user_id = p_actor_id AND m.organization_id = v_parent AND m.role IN ('owner','admin')
                AND m.status <> 'blocked' AND m.deleted_at IS NULL AND o.organization_type = 'reseller' AND o.status = 'active'
        ) THEN RAISE EXCEPTION 'No tienes permiso para aprovisionar esta organización'; END IF;
    END IF;
    IF v_parent IS NULL AND v_type IN ('client','reseller') THEN
        SELECT id INTO v_parent FROM organizations WHERE organization_type = 'platform' AND status = 'active' ORDER BY created_at LIMIT 1;
    END IF;
    IF p_invite_code IS NULL AND nullif(p_input->>'admin_email','') IS NOT NULL THEN
        IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_owner AND lower(email) = lower(p_input->>'admin_email')) THEN
            RAISE EXCEPTION 'No se pudo verificar el propietario de la organización';
        END IF;
    END IF;
    SELECT id INTO v_product FROM saas_products WHERE status = 'published' ORDER BY created_at LIMIT 1;
    -- Preserve the slug the administrator chose; collisions require an explicit correction.
    INSERT INTO organizations (name,slug,logo_url,active_app_id,app_activated_at,subscription_product_id,subscription_status,
        parent_organization_id,organization_type,status,acquired_by_reseller_id,acquisition_date,rate_limit_config,provisioned_by,owner_id)
    VALUES (trim(p_input->>'name'),p_input->>'slug',p_input->>'logo_url',p_input->>'app_id',now(),v_product,'active',
        v_parent,v_type,'active',v_reseller,CASE WHEN v_reseller IS NOT NULL THEN now() END,
        '{"requests_per_minute":500,"ai_requests_per_day":100,"ai_mode":"byok","ai_status":"active"}',p_actor_id,v_owner)
    RETURNING * INTO v_org;
    v_assignment := assign_app_to_organization(v_org.id, p_input->>'app_id', true);
    IF coalesce((v_assignment->>'success')::boolean,false) IS NOT TRUE THEN
        RAISE EXCEPTION 'No se pudo configurar el espacio de la organización';
    END IF;
    IF v_owner IS NOT NULL THEN
        INSERT INTO organization_members (organization_id,user_id,role) VALUES (v_org.id,v_owner,'owner');
    END IF;
    IF v_owner IS DISTINCT FROM p_actor_id THEN
        INSERT INTO organization_members (organization_id,user_id,role,permissions)
        VALUES (v_org.id,p_actor_id,'admin','{"is_support_proxy":true,"provisioner":true}');
    END IF;
    INSERT INTO organization_settings (organization_id,agency_name,portal_theme_config)
        VALUES (v_org.id,v_org.name,coalesce(p_defaults->'portal_theme_config','{}'));
    INSERT INTO saas_subscriptions (organization_id,plan_id,status,payment_gateway,current_period_start)
        VALUES (v_org.id,p_input->>'app_id','active','manual',now());
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_defaults->'roles') LOOP
        INSERT INTO organization_roles (organization_id,name,description,is_system_role,hierarchy_level,permissions)
        VALUES (v_org.id,v_row->>'name',v_row->>'description',true,(v_row->>'hierarchy_level')::integer,v_row->'permissions');
    END LOOP;
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_defaults->'categories') LOOP
        INSERT INTO service_categories (organization_id,name,slug,icon,color,order_index,scope,is_active)
        VALUES (v_org.id,v_row->>'name',v_row->>'slug',v_row->>'icon',v_row->>'color',(v_row->>'order_index')::integer,v_row->>'scope',true);
    END LOOP;
    -- The baseline INSERT trigger seeds legacy stages without a pipeline. This
    -- organization was just inserted in this transaction: replace only those
    -- orphan defaults with the selected template. Replays return before here.
    DELETE FROM pipeline_stages WHERE organization_id = v_org.id AND pipeline_id IS NULL;
    -- Initialize CRM without the old destructive cleanup pass on retries.
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_defaults->'crm'->'processStates') LOOP
        INSERT INTO process_states (organization_id,type,key,name,is_initial,is_terminal,allowed_next_states,metadata,suggested_actions)
        VALUES (v_org.id,v_row->>'type',v_row->>'key',v_row->>'name',coalesce((v_row->>'is_initial')::boolean,false),
            coalesce((v_row->>'is_terminal')::boolean,false),ARRAY(SELECT jsonb_array_elements_text(v_row->'allowed_next_states')),
            coalesce(v_row->'metadata','{}'),coalesce(v_row->'suggested_actions','[]'));
    END LOOP;
    INSERT INTO pipelines (organization_id,name,is_default,process_enabled)
        VALUES (v_org.id,'Ventas (' || (p_defaults->'crm'->>'name') || ')',true,true) RETURNING id INTO v_pipeline;
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_defaults->'crm'->'pipelineStages') LOOP
        v_order := v_order + 1;
        INSERT INTO pipeline_stages (organization_id,pipeline_id,name,status_key,display_order,color,icon,is_active)
        VALUES (v_org.id,v_pipeline,v_row->>'name',v_row->>'key',v_order,v_row->>'color',coalesce(v_row->>'icon','circle'),true)
        RETURNING id INTO v_stage;
        IF nullif(v_row->>'mapToProcessKey','') IS NOT NULL THEN
            INSERT INTO pipeline_process_map (organization_id,pipeline_stage_id,process_type,process_state_key)
                VALUES (v_org.id,v_stage,'sale',v_row->>'mapToProcessKey');
        END IF;
    END LOOP;
    IF p_invite_code IS NOT NULL THEN
        UPDATE platform_access_invitations SET uses_count = coalesce(uses_count,0) + 1,
            status = CASE WHEN max_uses > 0 AND coalesce(uses_count,0) + 1 >= max_uses THEN 'exhausted' ELSE 'active' END
            WHERE id = v_invite.id;
    END IF;
    INSERT INTO tenant_provisioning_requests (actor_id,request_key,organization_id,input,invite_id,recipient_email)
        VALUES (p_actor_id,p_request_key,v_org.id,p_input,v_invite.id,p_input->>'admin_email');
    SELECT * INTO v_org FROM organizations WHERE id = v_org.id;
    RETURN jsonb_build_object('organization',to_jsonb(v_org),'reused',false);
END;
$$;
REVOKE ALL ON FUNCTION public.provision_tenant_atomic(uuid,text,jsonb,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant_atomic(uuid,text,jsonb,uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_tenant_activation(p_organization_id uuid, p_resend boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_request tenant_provisioning_requests; v_claim uuid := gen_random_uuid();
BEGIN
    -- Historical tenants also get a durable delivery record, without changing ownership.
    INSERT INTO tenant_provisioning_requests (actor_id,request_key,organization_id,input)
        SELECT coalesce(provisioned_by,owner_id),'historical:' || id::text,id,'{}' FROM organizations
        WHERE id = p_organization_id AND owner_id IS NOT NULL
        ON CONFLICT (organization_id) DO NOTHING;
    SELECT * INTO v_request FROM tenant_provisioning_requests WHERE organization_id = p_organization_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La organización no tiene propietario'; END IF;
    IF v_request.activation_status = 'sent' AND NOT p_resend THEN RETURN '{"already_sent":true}'::jsonb; END IF;
    IF v_request.activation_attempted_at > now() - interval '1 minute' THEN RETURN '{"claimed":false}'::jsonb; END IF;
    UPDATE tenant_provisioning_requests SET activation_status = 'sending',activation_claim_id = v_claim,
        activation_attempted_at = now(),activation_error = NULL WHERE id = v_request.id;
    RETURN jsonb_build_object('claimed',true,'claim_id',v_claim);
END;
$$;
CREATE OR REPLACE FUNCTION public.finish_tenant_activation(p_organization_id uuid, p_claim_id uuid, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE tenant_provisioning_requests SET activation_status = CASE WHEN p_error IS NULL THEN 'sent' ELSE 'failed' END,
        activation_error = p_error WHERE organization_id = p_organization_id AND activation_claim_id = p_claim_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'El intento de envío ya no está vigente'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_tenant_activation(uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_tenant_activation(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_tenant_activation(uuid,boolean), public.finish_tenant_activation(uuid,uuid,text) TO service_role;

-- Conservative historical repair. Expected owner is a reviewed proposal, not
-- authority: recompute ownership from persisted records under locks.
CREATE OR REPLACE FUNCTION public.repair_tenant_ownership(p_organization_id uuid, p_expected_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_org organizations; v_owner uuid; v_count integer; v_canonical organization_members; v_proxy boolean;
BEGIN
    SELECT * INTO STRICT v_org FROM organizations WHERE id = p_organization_id FOR UPDATE;
    IF v_org.status = 'archived' OR v_org.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'La organización está archivada'; END IF;
    PERFORM 1 FROM organization_members WHERE organization_id = p_organization_id FOR UPDATE;
    SELECT * INTO v_canonical FROM organization_members WHERE organization_id = p_organization_id AND user_id = v_org.owner_id;
    SELECT count(*), (array_agg(user_id))[1] INTO v_count,v_owner FROM organization_members
        WHERE organization_id = p_organization_id AND role = 'owner' AND status <> 'blocked' AND deleted_at IS NULL
            AND NOT coalesce((permissions->>'is_support_proxy')::boolean,false);
    IF v_count > 1 THEN RAISE EXCEPTION 'Hay varios propietarios. Requiere revisión manual'; END IF;
    v_proxy := coalesce((v_canonical.permissions->>'is_support_proxy')::boolean,false);
    IF v_org.owner_id IS NOT NULL AND NOT v_proxy THEN
        IF v_canonical.user_id IS NULL OR v_canonical.status = 'blocked' OR v_canonical.deleted_at IS NOT NULL OR
            (v_count = 1 AND v_owner IS DISTINCT FROM v_org.owner_id) THEN
            RAISE EXCEPTION 'La propiedad actual no permite una reparación automática';
        END IF;
        v_owner := v_org.owner_id;
    ELSIF v_count = 0 THEN
        SELECT count(*),(array_agg(id))[1] INTO v_count,v_owner FROM auth.users
            WHERE raw_app_meta_data->>'invited_org_id' = p_organization_id::text;
        IF v_count <> 1 THEN RAISE EXCEPTION 'No existe un propietario verificable único'; END IF;
    END IF;
    IF v_owner IS DISTINCT FROM p_expected_owner_id OR v_owner IS NULL THEN RAISE EXCEPTION 'Los datos de propiedad cambiaron. Repite la auditoría'; END IF;
    IF EXISTS (SELECT 1 FROM organization_members WHERE organization_id = p_organization_id AND user_id = v_owner
        AND (status = 'blocked' OR deleted_at IS NOT NULL OR coalesce((permissions->>'is_support_proxy')::boolean,false))) THEN
        RAISE EXCEPTION 'El propietario está bloqueado o es un proxy de soporte';
    END IF;
    INSERT INTO organization_members (organization_id,user_id,role) VALUES (p_organization_id,v_owner,'owner')
        ON CONFLICT (organization_id,user_id) DO UPDATE SET role = 'owner';
    UPDATE organizations SET owner_id = v_owner WHERE id = p_organization_id;
    IF v_proxy AND v_canonical.role = 'owner' THEN
        UPDATE organization_members SET role = 'admin' WHERE organization_id = p_organization_id AND user_id = v_canonical.user_id;
    END IF;
    RETURN jsonb_build_object('organization_id',p_organization_id,'owner_id',v_owner);
END;
$$;
REVOKE ALL ON FUNCTION public.repair_tenant_ownership(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_tenant_ownership(uuid,uuid) TO service_role;
COMMIT;
