-- Read-only reporting. No campaign, consent, message or delivery mutations.
BEGIN;
CREATE INDEX marketing_history_recipients ON public.marketing_enrollments(organization_id,campaign_id,id);

CREATE FUNCTION public.marketing_history_delivery(p_outbox text,p_receipt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN p_outbox='failed' OR p_receipt='failed' THEN 'failed'
 WHEN p_outbox='accepted' AND p_receipt='read' THEN 'read'
 WHEN p_outbox='accepted' AND p_receipt='delivered' THEN 'delivered'
 WHEN p_outbox IN ('queued','sending','accepted','unknown') THEN p_outbox ELSE 'not_started' END
$$;
REVOKE ALL ON FUNCTION public.marketing_history_delivery(text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.marketing_history_receipt(p_message text,p_ledger text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN p_message='read' OR p_ledger='read' THEN 'read'
 WHEN p_message='delivered' OR p_ledger='delivered' THEN 'delivered'
 WHEN p_message='failed' OR p_ledger='failed' THEN 'failed' ELSE coalesce(p_message,p_ledger) END
$$;
REVOKE ALL ON FUNCTION public.marketing_history_receipt(text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.marketing_history_access(p_org uuid,p_campaign uuid,p_export boolean)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE channel uuid; membership record; perms jsonb; channels jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND (NOT public.marketing_has_permission(p_org,'view')
 OR (p_export AND NOT public.marketing_has_permission(p_org,'export'))) THEN RAISE EXCEPTION 'Marketing report access denied'; END IF;
 SELECT connection_id INTO channel FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 IF coalesce(auth.role(),'')='service_role' OR channel IS NULL THEN RETURN; END IF;
 SELECT m.role,r.hierarchy_level,coalesce(r.permissions,'{}')||coalesce(m.permissions,'{}') permissions INTO membership
 FROM public.organization_members m LEFT JOIN public.organization_roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
 WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active';
 perms:=membership.permissions;
 IF membership.hierarchy_level=100 OR lower(membership.role) IN ('owner','dueño','propietario') OR perms->>'all'='true'
 OR perms->>'inbox.conversations.global_view'='true' THEN RETURN; END IF;
 channels:=coalesce(nullif(perms->'inbox_access','null'),nullif(perms#>'{modules,inbox,inbox_access}','null'),perms#>'{inbox,inbox_access}','[]');
 IF jsonb_typeof(channels)<>'array' OR NOT channels ? channel::text THEN RAISE EXCEPTION 'Marketing channel access denied'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.marketing_history_access(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.marketing_history_matches(p_org uuid,p_campaign uuid,p_status text,p_search text,p_delivery text)
-- Fully qualified relations; keep this SQL helper inlineable so keyset LIMIT/filters reach its indexes.
RETURNS SETOF public.marketing_enrollments LANGUAGE sql STABLE AS $$
 SELECT e.* FROM public.marketing_enrollments e
 LEFT JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=p_org
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=p_org
 WHERE e.organization_id=p_org AND e.campaign_id=p_campaign AND (p_status='all' OR e.status=p_status)
 AND (p_search='' OR strpos(lower(coalesce(e.recipient_snapshot->>'name',l.name,'')),lower(p_search))>0
 OR strpos(coalesce(e.recipient,l.phone,''),p_search)>0)
 AND (p_delivery='all' OR EXISTS(SELECT 1 FROM public.meta_outbound_outbox o LEFT JOIN public.messages m ON m.id=o.message_id AND m.organization_id=p_org
 LEFT JOIN public.meta_message_statuses ms ON ms.organization_id=p_org AND ms.connection_id=o.connection_id AND ms.external_id=o.external_id
 WHERE o.organization_id=p_org AND o.connection_id=c.connection_id AND o.operation_key LIKE 'campaign:%'
 AND split_part(o.operation_key,':',2)=e.id::text AND public.marketing_history_delivery(o.status,public.marketing_history_receipt(m.status,ms.status))=p_delivery))
$$;
REVOKE ALL ON FUNCTION public.marketing_history_matches(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.validate_marketing_history_filters(p_status text,p_search text,p_delivery text,p_limit integer)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('all','active','completed','failed','cancelled') OR p_delivery IS NULL
 OR p_delivery NOT IN ('all','queued','sending','accepted','delivered','read','failed','unknown') OR p_search IS NULL
 OR length(p_search)>80 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid report filters'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.validate_marketing_history_filters(text,text,text,integer) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.read_marketing_history(p_org uuid,p_campaign uuid,p_status text DEFAULT 'all',p_search text DEFAULT '',
 p_delivery text DEFAULT 'all',p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_export IS NULL THEN RAISE EXCEPTION 'Invalid report mode'; END IF;
 PERFORM public.marketing_history_access(p_org,p_campaign,p_export);
 PERFORM public.validate_marketing_history_filters(p_status,p_search,p_delivery,p_limit);
 WITH matching AS NOT MATERIALIZED (SELECT * FROM public.marketing_history_matches(p_org,p_campaign,p_status,p_search,p_delivery)),
 page AS MATERIALIZED (SELECT * FROM matching WHERE id>=coalesce(p_after,'00000000-0000-0000-0000-000000000000'::uuid)
 AND (p_after IS NULL OR id<>p_after) ORDER BY id LIMIT p_limit+1),
 visible AS (SELECT * FROM page ORDER BY id LIMIT p_limit),
 details AS (SELECT e.id,e.status,left(coalesce(e.recipient_snapshot->>'name',l.name,'Contacto sin nombre'),160) name,
 left(coalesce(e.recipient,l.phone,''),40) phone,e.started_at,e.last_run_at,e.completed_at,e.next_run_at,
 CASE WHEN e.status='cancelled' THEN 'Inscripción cancelada; revisa la autorización vigente.'
 WHEN e.status='failed' THEN 'El procesamiento requiere revisión; no se reintenta automáticamente.' END issue,
 d.counts FROM visible e LEFT JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=p_org
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=p_org
 CROSS JOIN LATERAL (SELECT jsonb_build_object('total',count(*),'queued',count(*) FILTER(WHERE state='queued'),
 'sending',count(*) FILTER(WHERE state='sending'),'accepted',count(*) FILTER(WHERE state='accepted'),
 'delivered',count(*) FILTER(WHERE state='delivered'),'read',count(*) FILTER(WHERE state='read'),
 'failed',count(*) FILTER(WHERE state='failed'),'unknown',count(*) FILTER(WHERE state='unknown')) counts
 FROM (SELECT public.marketing_history_delivery(o.status,public.marketing_history_receipt(m.status,ms.status)) state FROM public.meta_outbound_outbox o
 LEFT JOIN public.messages m ON m.id=o.message_id AND m.organization_id=p_org
 LEFT JOIN public.meta_message_statuses ms ON ms.organization_id=p_org AND ms.connection_id=o.connection_id AND ms.external_id=o.external_id
 WHERE o.organization_id=p_org AND o.connection_id=c.connection_id AND o.operation_key LIKE 'campaign:%'
 AND split_part(o.operation_key,':',2)=e.id::text) deliveries) d)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM details d),'[]'),
 'hasMore',(SELECT count(*)>p_limit FROM page),'nextCursor',CASE WHEN (SELECT count(*)>p_limit FROM page) THEN (SELECT max(id::text) FROM visible) END,
 'total',CASE WHEN p_after IS NULL THEN (SELECT count(*) FROM matching) END,'queriedAt',statement_timestamp()) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_history(uuid,uuid,text,text,text,uuid,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_history(uuid,uuid,text,text,text,uuid,integer,boolean) TO authenticated,service_role;

CREATE FUNCTION public.read_marketing_step_history(p_org uuid,p_campaign uuid,p_enrollment uuid DEFAULT NULL,p_status text DEFAULT 'all',
 p_search text DEFAULT '',p_delivery text DEFAULT 'all',p_after jsonb DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; after_enrollment uuid; after_order integer; after_step uuid;
BEGIN
 IF p_export IS NULL THEN RAISE EXCEPTION 'Invalid report mode'; END IF;
 PERFORM public.marketing_history_access(p_org,p_campaign,p_export);
 PERFORM public.validate_marketing_history_filters(p_status,p_search,p_delivery,p_limit);
 IF p_enrollment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE id=p_enrollment AND organization_id=p_org AND campaign_id=p_campaign)
 THEN RAISE EXCEPTION 'Recipient not found'; END IF;
 IF p_after IS NOT NULL THEN
  after_enrollment:=(p_after->>'enrollmentId')::uuid; after_order:=(p_after->>'order')::integer; after_step:=(p_after->>'stepId')::uuid;
  IF after_enrollment IS NULL OR after_order IS NULL OR after_step IS NULL THEN RAISE EXCEPTION 'Invalid step cursor'; END IF;
 END IF;
 WITH page AS MATERIALIZED (
 SELECT e.id enrollment_id,e.status enrollment_status,left(coalesce(e.recipient_snapshot->>'name',l.name,'Contacto sin nombre'),160) name,
 left(coalesce(e.recipient,l.phone,''),40) phone,s.id step_id,s.order_index,s.type,left(s.name,160) step_name,
 left(s.content->>'template_name',512) template_name,s.delay_config,c.connection_id,
 CASE WHEN e.status='completed' OR s.order_index<current_step.order_index THEN 'advanced'
 WHEN s.id=e.current_step_id THEN 'current' ELSE 'not_started' END progress
 FROM public.marketing_history_matches(p_org,p_campaign,p_status,p_search,p_delivery) e
 JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=p_org
 JOIN public.marketing_steps s ON s.sequence_id=e.sequence_id AND s.organization_id=p_org
 LEFT JOIN public.marketing_steps current_step ON current_step.id=e.current_step_id AND current_step.organization_id=p_org
 LEFT JOIN public.leads l ON l.id=e.contact_id AND l.organization_id=p_org
 WHERE (p_enrollment IS NULL OR e.id=p_enrollment) AND e.id>=coalesce(after_enrollment,'00000000-0000-0000-0000-000000000000'::uuid)
 AND (p_after IS NULL OR (e.id,s.order_index,s.id)>(after_enrollment,after_order,after_step))
 ORDER BY e.id,s.order_index,s.id LIMIT p_limit+1),
 visible AS (SELECT * FROM page ORDER BY enrollment_id,order_index,step_id LIMIT p_limit),
 details AS (SELECT v.enrollment_id,v.enrollment_status,v.name,v.phone,v.step_id,v.order_index,v.type,v.step_name,v.template_name,
 v.progress,public.marketing_history_delivery(o.status,public.marketing_history_receipt(m.status,ledger.status)) delivery,
 o.created_at queued_at,o.updated_at updated_at,ledger.event_timestamp receipt_at,
 CASE WHEN o.error_kind ~ '^meta_[0-9]{1,9}$' THEN substring(o.error_kind FROM 6)::integer
 ELSE (SELECT (item->>'code')::integer FROM public.meta_message_statuses ms CROSS JOIN LATERAL jsonb_array_elements(
 CASE WHEN jsonb_typeof(ms.error_codes)='array' THEN ms.error_codes ELSE '[]' END) item
 WHERE ms.organization_id=p_org AND ms.connection_id=v.connection_id AND ms.external_id=o.external_id
 AND ms.status='failed' AND item->>'code' ~ '^[0-9]{1,9}$' LIMIT 1) END error_code
 FROM visible v LEFT JOIN public.meta_outbound_outbox o ON o.organization_id=p_org AND o.connection_id=v.connection_id
 AND o.operation_key='campaign:'||v.enrollment_id::text||':'||v.step_id::text
 LEFT JOIN public.messages m ON m.id=o.message_id AND m.organization_id=p_org
 LEFT JOIN public.meta_message_statuses ledger ON ledger.organization_id=p_org AND ledger.connection_id=o.connection_id AND ledger.external_id=o.external_id)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY enrollment_id,order_index,step_id) FROM details d),'[]'),
 'hasMore',(SELECT count(*)>p_limit FROM page),'nextCursor',CASE WHEN (SELECT count(*)>p_limit FROM page) THEN
 (SELECT jsonb_build_object('enrollmentId',enrollment_id,'order',order_index,'stepId',step_id) FROM visible
 ORDER BY enrollment_id DESC,order_index DESC,step_id DESC LIMIT 1) END,'queriedAt',statement_timestamp()) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_step_history(uuid,uuid,uuid,text,text,text,jsonb,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_step_history(uuid,uuid,uuid,text,text,text,jsonb,integer,boolean) TO authenticated,service_role;
COMMIT;
