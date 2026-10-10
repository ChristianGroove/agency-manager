-- Static imported lists share CRM identities; delivery does not qualify a sales lead.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS leads_organization_identity ON public.leads(organization_id,id);
CREATE TABLE public.marketing_contact_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 created_by uuid NOT NULL REFERENCES auth.users(id), UNIQUE(organization_id,id)
);
CREATE TABLE public.marketing_contact_list_members (
 organization_id uuid NOT NULL, list_id uuid NOT NULL, contact_id uuid NOT NULL,
 PRIMARY KEY(organization_id,list_id,contact_id),
 FOREIGN KEY(organization_id,list_id) REFERENCES public.marketing_contact_lists(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,contact_id) REFERENCES public.leads(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX marketing_contact_list_page ON public.marketing_contact_lists(organization_id,created_at DESC,id DESC);
CREATE INDEX marketing_contact_list_contact ON public.marketing_contact_list_members(organization_id,contact_id);
ALTER TABLE public.marketing_contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_contact_list_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_contact_lists,public.marketing_contact_list_members FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.marketing_contact_lists,public.marketing_contact_list_members TO service_role;

CREATE OR REPLACE FUNCTION public.marketing_audience_candidates(p_org uuid,p_filters jsonb)
RETURNS SETOF public.leads LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_filters IS NULL OR jsonb_typeof(p_filters) <> 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) key
   WHERE key NOT IN ('list_id','status','source','assigned_to','has_phone','has_email','score_min','score_max','tags',
     'created_after','created_before','last_activity_after','last_activity_before')) THEN RAISE EXCEPTION 'Invalid audience filters'; END IF;
 IF p_filters ? 'list_id' AND (p_filters->>'list_id' IS NULL OR NOT EXISTS(SELECT 1 FROM public.marketing_contact_lists WHERE id=(p_filters->>'list_id')::uuid AND organization_id=p_org)) THEN RAISE EXCEPTION 'List unavailable'; END IF;
 RETURN QUERY SELECT l.* FROM public.leads l WHERE l.organization_id=p_org AND l.deleted_at IS NULL
 AND (NOT (p_filters ? 'list_id') OR EXISTS(SELECT 1 FROM public.marketing_contact_list_members m WHERE m.organization_id=p_org AND m.list_id=(p_filters->>'list_id')::uuid AND m.contact_id=l.id))
 AND (nullif(p_filters->>'status','') IS NULL OR l.status=p_filters->>'status')
 AND (nullif(p_filters->>'source','') IS NULL OR l.source=p_filters->>'source')
 AND (nullif(p_filters->>'assigned_to','') IS NULL OR l.assigned_to=(p_filters->>'assigned_to')::uuid)
 AND (coalesce((p_filters->>'has_phone')::boolean,false)=false OR l.phone IS NOT NULL)
 AND (coalesce((p_filters->>'has_email')::boolean,false)=false OR l.email IS NOT NULL)
 AND (p_filters->>'score_min' IS NULL OR l.score >= (p_filters->>'score_min')::numeric)
 AND (p_filters->>'score_max' IS NULL OR l.score <= (p_filters->>'score_max')::numeric)
 AND (coalesce(jsonb_array_length(p_filters->'tags'),0)=0 OR l.tags && ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags')))
 AND (p_filters->>'created_after' IS NULL OR l.created_at >= (p_filters->>'created_after')::timestamptz)
 AND (p_filters->>'created_before' IS NULL OR l.created_at <= (p_filters->>'created_before')::timestamptz)
 AND (p_filters->>'last_activity_after' IS NULL OR l.last_activity_at >= (p_filters->>'last_activity_after')::timestamptz)
 AND (p_filters->>'last_activity_before' IS NULL OR l.last_activity_at <= (p_filters->>'last_activity_before')::timestamptz);
END $$;
REVOKE ALL ON FUNCTION public.marketing_audience_candidates(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_audience_candidates(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_marketing_import(p_org uuid,p_actor uuid,p_ticket uuid,p_rows integer[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' SET statement_timeout='10s' AS $$
DECLARE ticket public.marketing_review_tickets; item jsonb; subject jsonb; contact uuid; created integer:=0; existing integer:=0; chosen jsonb; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') OR NOT public.marketing_actor_permission(p_org,p_actor,'execute')
 THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='import' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 IF coalesce(cardinality(p_rows),0) NOT BETWEEN 1 AND 100 OR cardinality(p_rows)<>(SELECT count(DISTINCT x) FROM unnest(p_rows)x) THEN RAISE EXCEPTION 'Invalid selection'; END IF;
 SELECT jsonb_agg(x ORDER BY x) INTO chosen FROM unnest(p_rows)x;
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM chosen THEN RAISE EXCEPTION 'Selection changed'; END IF;
  RETURN ticket.result; END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) AND value->>'eligible'='true')<>cardinality(p_rows)
 THEN RAISE EXCEPTION 'Invalid selection'; END IF;
 -- Same recipient lock as manual/inbound withdrawals. Acquire all locks in canonical order.
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'phone' LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||(item->>'phone'),0));
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'phone' LOOP
  subject:=public.marketing_import_subject(p_org,item->>'phone');
  IF subject IS DISTINCT FROM item->'subject' THEN RAISE EXCEPTION 'Recipient changed; review again'; END IF;
  IF subject->>'pending'='true' OR subject->'event'->>'event'='revoked' OR EXISTS(SELECT 1 FROM jsonb_array_elements(subject->'contacts') WHERE value->>'out'='true') THEN RAISE EXCEPTION 'Existing opt-out'; END IF;
  IF jsonb_array_length(subject->'contacts')=0 THEN
   INSERT INTO public.leads(organization_id,name,phone,email,source,contact_type,status) VALUES(p_org,item->>'name',item->>'phone',nullif(item->>'email',''),'marketing_import','prospect','marketing_contact') RETURNING id INTO contact;
   created:=created+1;
  ELSE contact:=(subject->'contacts'->0->>'id')::uuid; existing:=existing+1; END IF;
  PERFORM public.record_marketing_consent(p_org,item->>'phone','granted',item->>'source',item->>'evidence',(item->>'occurredAt')::timestamptz,p_actor);
 END LOOP;
 outcome:=jsonb_build_object('created',created,'existing',existing,'consents',cardinality(p_rows));
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),selection=chosen,result=outcome,payload='null'::jsonb WHERE id=ticket.id;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_import(uuid,uuid,uuid,integer[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_import(uuid,uuid,uuid,integer[]) TO service_role;

CREATE FUNCTION public.confirm_marketing_list_import(p_org uuid,p_actor uuid,p_ticket uuid,p_rows integer[],p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' SET statement_timeout='10s' AS $$
DECLARE ticket public.marketing_review_tickets; payload jsonb; outcome jsonb; chosen jsonb; list uuid;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') OR NOT public.marketing_actor_permission(p_org,p_actor,'execute') THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid list name'; END IF;
 IF coalesce(cardinality(p_rows),0) NOT BETWEEN 1 AND 100 OR cardinality(p_rows)<>(SELECT count(DISTINCT x) FROM unnest(p_rows)x) THEN RAISE EXCEPTION 'Invalid selection'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='import' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 SELECT jsonb_agg(x ORDER BY x) INTO chosen FROM unnest(p_rows)x;
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM chosen OR ticket.result->>'listName' IS DISTINCT FROM trim(p_name) OR NOT(ticket.result ? 'listId') THEN RAISE EXCEPTION 'List selection changed'; END IF;
  RETURN ticket.result;
 END IF;
 payload:=ticket.payload;
 -- The original confirmation keeps consent snapshots, recipient locks and all-or-nothing semantics.
 outcome:=public.confirm_marketing_import(p_org,p_actor,p_ticket,p_rows);
 INSERT INTO public.marketing_contact_lists(organization_id,name,created_by) VALUES(p_org,trim(p_name),p_actor) RETURNING id INTO list;
 INSERT INTO public.marketing_contact_list_members(organization_id,list_id,contact_id)
 SELECT p_org,list,l.id FROM jsonb_array_elements(payload) item JOIN public.leads l
 ON l.organization_id=p_org AND l.deleted_at IS NULL AND public.marketing_phone_key(l.phone)=item->>'phone'
 WHERE (item->>'row')::integer=ANY(p_rows);
 IF (SELECT count(*) FROM public.marketing_contact_list_members WHERE organization_id=p_org AND list_id=list)<>cardinality(p_rows) THEN RAISE EXCEPTION 'List recipients changed'; END IF;
 outcome:=outcome||jsonb_build_object('listId',list,'listName',trim(p_name));
 UPDATE public.marketing_review_tickets SET result=outcome WHERE id=p_ticket;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_list_import(uuid,uuid,uuid,integer[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_list_import(uuid,uuid,uuid,integer[],text) TO service_role;

CREATE FUNCTION public.read_marketing_contact_list_page(p_org uuid,p_search text DEFAULT '',p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL,p_selected uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR (p_before IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'Invalid list page'; END IF;
 WITH candidates AS MATERIALIZED (
  SELECT id,name,created_at FROM public.marketing_contact_lists WHERE organization_id=p_org
  AND (p_search='' OR strpos(lower(name),lower(p_search))>0) AND (p_before IS NULL OR (created_at,id)<(p_before,p_before_id))
  ORDER BY created_at DESC,id DESC LIMIT 21
 ), page AS MATERIALIZED(SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT 20)
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'createdAt',p.created_at,
  'contacts',(SELECT count(*) FROM public.marketing_contact_list_members m JOIN public.leads l ON l.id=m.contact_id AND l.organization_id=m.organization_id
   WHERE m.organization_id=p_org AND m.list_id=p.id AND l.deleted_at IS NULL)) ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'),
 'next',CASE WHEN (SELECT count(*) FROM candidates)>20 THEN (SELECT jsonb_build_object('createdAt',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1) ELSE NULL END,
 'selected',(SELECT jsonb_build_object('id',id,'name',name) FROM public.marketing_contact_lists WHERE organization_id=p_org AND id=p_selected)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_contact_list_page(uuid,text,timestamptz,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_contact_list_page(uuid,text,timestamptz,uuid,uuid) TO authenticated,service_role;
COMMIT;
