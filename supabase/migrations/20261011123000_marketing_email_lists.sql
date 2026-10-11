BEGIN;
CREATE FUNCTION public.marketing_email_import_subject(p_org uuid,p_email text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('contacts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'email',email,'name',name) ORDER BY id) FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL AND public.marketing_email_key(email)=p_email),'[]'),
 'permission',(SELECT to_jsonb(p) FROM public.marketing_email_permissions p WHERE p.organization_id=p_org AND p.recipient=p_email))
$$;
CREATE FUNCTION public.prepare_marketing_email_import(p_org uuid,p_actor uuid,p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; subject jsonb; stored jsonb:='[]'; displayed jsonb:='[]'; seen text[]:='{}'; eligible boolean; reason text; ticket public.marketing_review_tickets; address text;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid email import'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  address:=public.marketing_email_key(item->>'email');
  IF address IS NULL OR address IS DISTINCT FROM item->>'email' OR item->>'row' IS NULL OR (item->>'row')::integer NOT BETWEEN 2 AND 10002 OR length(trim(coalesce(item->>'name',''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid email row'; END IF;
  subject:=public.marketing_email_import_subject(p_org,address);
  eligible:=NOT (address=ANY(seen)) AND jsonb_array_length(subject->'contacts')<=1;
  reason:=CASE WHEN address=ANY(seen) THEN 'duplicate' WHEN jsonb_array_length(subject->'contacts')>1 THEN 'multiple'
   WHEN subject#>>'{permission,revoked_at}' IS NOT NULL THEN 'contact_withdrawn' WHEN jsonb_array_length(subject->'contacts')=0 THEN 'contact_new' ELSE 'contact_existing' END;
  seen:=array_append(seen,address);
  stored:=stored||jsonb_build_array(item||jsonb_build_object('subject',subject,'eligible',eligible));
  displayed:=displayed||jsonb_build_array(jsonb_build_object('row',(item->>'row')::integer,'name',item->>'name','phone',address,'eligible',eligible,'reason',reason));
 END LOOP;
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'email_import',stored) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'rows',displayed);
END $$;
CREATE FUNCTION public.confirm_marketing_email_import(p_org uuid,p_actor uuid,p_ticket uuid,p_rows integer[],p_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='3s' SET statement_timeout='20s' AS $$
DECLARE ticket public.marketing_review_tickets; chosen jsonb; item jsonb; subject jsonb; contact uuid; list uuid; created integer:=0; existing integer:=0; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 160 OR coalesce(cardinality(p_rows),0) NOT BETWEEN 1 AND 1000 OR cardinality(p_rows)<>(SELECT count(DISTINCT x) FROM unnest(p_rows)x) THEN RAISE EXCEPTION 'Invalid import selection'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='email_import' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Import review unavailable'; END IF;
 SELECT jsonb_agg(x ORDER BY x) INTO chosen FROM unnest(p_rows)x;
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM chosen OR ticket.result->>'listName' IS DISTINCT FROM trim(p_name) THEN RAISE EXCEPTION 'Import selection changed'; END IF;
  RETURN ticket.result;
 END IF;
 IF ticket.expires_at<clock_timestamp() OR (SELECT count(*) FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) AND value->>'eligible'='true')<>cardinality(p_rows) THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'email' LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('email:'||p_org::text||':'||(item->>'email'),0));
 END LOOP;
 INSERT INTO public.marketing_contact_lists(organization_id,name,created_by) VALUES(p_org,trim(p_name),p_actor) RETURNING id INTO list;
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'email' LOOP
  subject:=public.marketing_email_import_subject(p_org,item->>'email');
  IF subject IS DISTINCT FROM item->'subject' THEN RAISE EXCEPTION 'Recipient changed; review again'; END IF;
  IF jsonb_array_length(subject->'contacts')=0 THEN
   INSERT INTO public.leads(organization_id,name,email,source,contact_type,status) VALUES(p_org,item->>'name',item->>'email','marketing_import','prospect','marketing_contact') RETURNING id INTO contact; created:=created+1;
  ELSE contact:=(subject->'contacts'->0->>'id')::uuid; existing:=existing+1; END IF;
  INSERT INTO public.marketing_contact_list_members(organization_id,list_id,contact_id) VALUES(p_org,list,contact);
 END LOOP;
 outcome:=jsonb_build_object('created',created,'existing',existing,'consents',0,'listId',list,'listName',trim(p_name));
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),selection=chosen,result=outcome,payload='null'::jsonb WHERE id=p_ticket;
 RETURN outcome;
END $$;
CREATE FUNCTION public.marketing_email_list_snapshot(p_org uuid,p_list uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.marketing_contact_lists WHERE id=p_list AND organization_id=p_org) THEN RAISE EXCEPTION 'List unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'email',public.marketing_email_key(l.email),'name',l.name,'deleted',l.deleted_at,
 'permission',p.granted_at,'withdrawn',p.revoked_at) ORDER BY l.id),'[]') INTO result FROM public.marketing_contact_list_members m JOIN public.leads l ON l.id=m.contact_id AND l.organization_id=m.organization_id
 LEFT JOIN public.marketing_email_permissions p ON p.organization_id=p_org AND p.recipient=public.marketing_email_key(l.email) WHERE m.organization_id=p_org AND m.list_id=p_list;
 RETURN result;
END $$;
CREATE FUNCTION public.prepare_marketing_email_list_authorization(p_org uuid,p_actor uuid,p_list uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE snapshot jsonb; ticket public.marketing_review_tickets; eligible integer;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 snapshot:=public.marketing_email_list_snapshot(p_org,p_list);
 SELECT count(DISTINCT value->>'email') INTO eligible FROM jsonb_array_elements(snapshot) WHERE value->>'email' IS NOT NULL AND value->>'deleted' IS NULL AND value->>'permission' IS NULL AND value->>'withdrawn' IS NULL;
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'email_authorization',jsonb_build_object('list',p_list,'snapshot',snapshot)) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'listName',(SELECT name FROM public.marketing_contact_lists WHERE id=p_list AND organization_id=p_org),'contacts',jsonb_array_length(snapshot),'toAuthorize',eligible,'excluded',jsonb_array_length(snapshot)-eligible);
END $$;
CREATE FUNCTION public.confirm_marketing_email_list_authorization(p_org uuid,p_actor uuid,p_ticket uuid,p_confirmed boolean,p_reference text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='3s' AS $$
DECLARE ticket public.marketing_review_tickets; snapshot jsonb; address text; affected integer:=0; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR p_confirmed IS DISTINCT FROM true OR p_reference IS NULL OR length(p_reference)>1600 THEN RAISE EXCEPTION 'Declaration denied'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='email_authorization' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Declaration review unavailable'; END IF;
 IF ticket.used_at IS NOT NULL THEN RETURN ticket.result; END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Declaration expired'; END IF;
 FOR address IN SELECT DISTINCT value->>'email' FROM jsonb_array_elements(ticket.payload->'snapshot') WHERE value->>'email' IS NOT NULL ORDER BY 1 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('email:'||p_org::text||':'||address,0));
 END LOOP;
 snapshot:=public.marketing_email_list_snapshot(p_org,(ticket.payload->>'list')::uuid);
 IF snapshot IS DISTINCT FROM ticket.payload->'snapshot' THEN RAISE EXCEPTION 'Recipients changed; review again'; END IF;
 INSERT INTO public.marketing_email_permissions(organization_id,recipient,granted_at,actor,reference)
 SELECT DISTINCT p_org,value->>'email',clock_timestamp(),p_actor,p_reference FROM jsonb_array_elements(snapshot)
 WHERE value->>'email' IS NOT NULL AND value->>'deleted' IS NULL AND value->>'permission' IS NULL AND value->>'withdrawn' IS NULL
 ON CONFLICT(organization_id,recipient) DO UPDATE SET granted_at=EXCLUDED.granted_at,actor=EXCLUDED.actor,reference=EXCLUDED.reference WHERE public.marketing_email_permissions.revoked_at IS NULL AND public.marketing_email_permissions.granted_at IS NULL;
 GET DIAGNOSTICS affected=ROW_COUNT;
 outcome:=jsonb_build_object('authorized',affected);
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),result=outcome,payload='null'::jsonb WHERE id=p_ticket;
 RETURN outcome;
END $$;

CREATE FUNCTION public.read_marketing_email_metrics(p_org uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.marketing_has_permission(p_org,'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email') THEN RAISE EXCEPTION 'Email campaign unavailable'; END IF;
 SELECT jsonb_build_object('channel','email','stats',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE status='active'),'completed',count(*) FILTER(WHERE status='completed'),'failed',count(*) FILTER(WHERE status='failed'),'cancelled',count(*) FILTER(WHERE status='cancelled')) FROM public.marketing_enrollments WHERE campaign_id=p_campaign AND organization_id=p_org),
 'delivery',(SELECT jsonb_build_object('queued',0,'sending',count(*) FILTER(WHERE status='sending'),'accepted',count(*) FILTER(WHERE status='accepted'),'delivered',0,'read',0,'failed',count(*) FILTER(WHERE status='failed'),'unknown',count(*) FILTER(WHERE status='unknown')) FROM public.marketing_email_outbox WHERE campaign_id=p_campaign AND organization_id=p_org),'recentActivity','[]'::jsonb) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.read_marketing_email_history(p_org uuid,p_campaign uuid,p_status text DEFAULT 'all',p_search text DEFAULT '',p_delivery text DEFAULT 'all',p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_export IS NULL THEN RAISE EXCEPTION 'Invalid report mode'; END IF;
 PERFORM public.marketing_history_access(p_org,p_campaign,p_export);
 PERFORM public.validate_marketing_history_filters(p_status,p_search,p_delivery,p_limit);
 IF NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email') THEN RAISE EXCEPTION 'Email campaign unavailable'; END IF;
 WITH matching AS NOT MATERIALIZED(SELECT e.* FROM public.marketing_enrollments e WHERE e.campaign_id=p_campaign AND e.organization_id=p_org AND(p_status='all' OR e.status=p_status)
 AND(p_search='' OR strpos(lower(coalesce(e.recipient_snapshot->>'name','')),lower(p_search))>0 OR strpos(e.recipient,lower(p_search))>0)
 AND(p_delivery='all' OR EXISTS(SELECT 1 FROM public.marketing_email_outbox o WHERE o.enrollment_id=e.id AND o.organization_id=p_org AND o.status=p_delivery))),
 page AS MATERIALIZED(SELECT * FROM matching WHERE p_after IS NULL OR id>p_after ORDER BY id LIMIT p_limit+1),
 visible AS(SELECT * FROM page ORDER BY id LIMIT p_limit),
 details AS(SELECT e.id,e.status,left(coalesce(e.recipient_snapshot->>'name','Contacto'),160) name,e.recipient phone,e.started_at,e.last_run_at,e.completed_at,e.next_run_at,
 CASE WHEN e.status='failed' THEN 'Requiere revisión; no se reenvía automáticamente.' WHEN e.status='cancelled' THEN 'Baja o destinatario no disponible.' ELSE e.last_error END issue,
 (SELECT jsonb_build_object('total',count(*),'queued',0,'sending',count(*) FILTER(WHERE status='sending'),'accepted',count(*) FILTER(WHERE status='accepted'),'delivered',0,'read',0,'failed',count(*) FILTER(WHERE status='failed'),'unknown',count(*) FILTER(WHERE status='unknown')) FROM public.marketing_email_outbox WHERE enrollment_id=e.id AND organization_id=p_org) counts FROM visible e)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM details d),'[]'),'hasMore',(SELECT count(*)>p_limit FROM page),'nextCursor',CASE WHEN(SELECT count(*)>p_limit FROM page) THEN(SELECT max(id::text) FROM visible) END,'total',CASE WHEN p_after IS NULL THEN(SELECT count(*) FROM matching) END,'queriedAt',statement_timestamp()) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.read_marketing_email_step_history(p_org uuid,p_campaign uuid,p_enrollment uuid DEFAULT NULL,p_status text DEFAULT 'all',p_search text DEFAULT '',p_delivery text DEFAULT 'all',p_after_enrollment uuid DEFAULT NULL,p_after_order integer DEFAULT NULL,p_after_step uuid DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_export IS NULL THEN RAISE EXCEPTION 'Invalid report mode'; END IF;
 PERFORM public.marketing_history_access(p_org,p_campaign,p_export);
 PERFORM public.validate_marketing_history_filters(p_status,p_search,p_delivery,p_limit);
 IF NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email') THEN RAISE EXCEPTION 'Email campaign unavailable'; END IF;
 WITH page AS MATERIALIZED(SELECT e.id enrollment_id,e.status enrollment_status,coalesce(e.recipient_snapshot->>'name','Contacto') name,e.recipient phone,s.id step_id,s.order_index,s.name step_name,s.type,s.content->>'subject' template_name,
 CASE WHEN e.current_step_id=s.id THEN 'current' WHEN e.status='completed' OR s.order_index<(SELECT order_index FROM public.marketing_steps WHERE id=e.current_step_id AND organization_id=p_org) THEN 'advanced' ELSE 'not_started' END progress,
 coalesce(o.status,'not_started') delivery,o.created_at queued_at,o.updated_at,NULL::timestamptz receipt_at,NULL::integer error_code
 FROM public.marketing_enrollments e JOIN public.marketing_steps s ON s.sequence_id=e.sequence_id AND s.organization_id=p_org
 LEFT JOIN public.marketing_email_outbox o ON o.enrollment_id=e.id AND o.step_id=s.id AND o.organization_id=p_org
 WHERE e.organization_id=p_org AND e.campaign_id=p_campaign AND(p_enrollment IS NULL OR e.id=p_enrollment) AND(p_status='all' OR e.status=p_status)
 AND(p_search='' OR strpos(lower(coalesce(e.recipient_snapshot->>'name','')),lower(p_search))>0 OR strpos(e.recipient,lower(p_search))>0) AND(p_delivery='all' OR o.status=p_delivery)
 AND(p_after_enrollment IS NULL OR(e.id,s.order_index,s.id)>(p_after_enrollment,p_after_order,p_after_step)) ORDER BY e.id,s.order_index,s.id LIMIT p_limit+1),
 visible AS(SELECT * FROM page ORDER BY enrollment_id,order_index,step_id LIMIT p_limit)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY enrollment_id,order_index,step_id) FROM visible v),'[]'),'hasMore',(SELECT count(*)>p_limit FROM page),'nextCursor',CASE WHEN(SELECT count(*)>p_limit FROM page) THEN(SELECT jsonb_build_object('enrollmentId',enrollment_id,'order',order_index,'stepId',step_id) FROM visible ORDER BY enrollment_id DESC,order_index DESC,step_id DESC LIMIT 1) END,'queriedAt',statement_timestamp()) INTO result;
 RETURN result;
END $$;
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN(
 'marketing_email_import_subject','prepare_marketing_email_import','confirm_marketing_email_import','marketing_email_list_snapshot','prepare_marketing_email_list_authorization','confirm_marketing_email_list_authorization','read_marketing_email_metrics','read_marketing_email_history','read_marketing_email_step_history') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.read_marketing_email_metrics(uuid,uuid),public.read_marketing_email_history(uuid,uuid,text,text,text,uuid,integer,boolean),public.read_marketing_email_step_history(uuid,uuid,uuid,text,text,text,uuid,integer,uuid,integer,boolean) TO authenticated;
COMMIT;
