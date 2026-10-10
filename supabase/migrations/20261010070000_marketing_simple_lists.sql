-- Storage of contact lists is independent of a declaration of external permission.
BEGIN;
ALTER TABLE public.marketing_review_tickets DROP CONSTRAINT marketing_review_tickets_kind_check;
ALTER TABLE public.marketing_review_tickets ADD CONSTRAINT marketing_review_tickets_kind_check CHECK(kind IN('import','activation','renewal','contacts','list_authorization'));

CREATE FUNCTION public.prepare_marketing_contact_import(p_org uuid,p_actor uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='20s' AS $$
DECLARE item jsonb; subject jsonb; reason text; first_rows jsonb; stored jsonb:='[]'; displayed jsonb:='[]'; ticket public.marketing_review_tickets;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 1000
 OR (SELECT count(DISTINCT value->>'row') FROM jsonb_array_elements(p_rows))<>jsonb_array_length(p_rows) THEN RAISE EXCEPTION 'Invalid import'; END IF;
 SELECT jsonb_object_agg(phone,first_row) INTO first_rows FROM (SELECT value->>'phone' phone,min((value->>'row')::integer) first_row FROM jsonb_array_elements(p_rows) GROUP BY value->>'phone') d;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  IF coalesce((item->>'row')::integer,0) NOT BETWEEN 2 AND 1001 OR item->>'phone' IS NULL OR item->>'phone' !~ '^[1-9][0-9]{7,14}$'
  OR coalesce(length(trim(item->>'name')),0) NOT BETWEEN 1 AND 160 OR coalesce(length(item->>'email'),0)>254 THEN RAISE EXCEPTION 'Invalid import row'; END IF;
  subject:=public.marketing_import_subject(p_org,item->>'phone'); reason:=NULL;
  IF (item->>'row')::integer<>(first_rows->>(item->>'phone'))::integer THEN reason:='duplicate';
  ELSIF jsonb_array_length(subject->'contacts')>1 THEN reason:='multiple'; END IF;
  stored:=stored||jsonb_build_array(item||jsonb_build_object('subject',subject,'eligible',reason IS NULL));
  displayed:=displayed||jsonb_build_array(jsonb_build_object('row',(item->>'row')::integer,'name',item->>'name','phone',item->>'phone','eligible',reason IS NULL,
   'reason',coalesce(reason,CASE WHEN subject->>'pending'='true' OR subject->'event'->>'event'='revoked' OR EXISTS(SELECT 1 FROM jsonb_array_elements(subject->'contacts') WHERE value->>'out'='true') THEN 'contact_withdrawn'
    WHEN jsonb_array_length(subject->'contacts')=0 THEN 'contact_new' ELSE 'contact_existing' END)));
 END LOOP;
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'contacts',stored) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'rows',displayed);
END $$;
REVOKE ALL ON FUNCTION public.prepare_marketing_contact_import(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_marketing_contact_import(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.confirm_marketing_contact_import(p_org uuid,p_actor uuid,p_ticket uuid,p_rows integer[],p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' SET statement_timeout='20s' AS $$
DECLARE ticket public.marketing_review_tickets; item jsonb; subject jsonb; contact uuid; list uuid; chosen jsonb; outcome jsonb; created integer:=0; existing integer:=0;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 160 OR coalesce(cardinality(p_rows),0) NOT BETWEEN 1 AND 1000
 OR cardinality(p_rows)<>(SELECT count(DISTINCT x) FROM unnest(p_rows)x) THEN RAISE EXCEPTION 'Invalid list selection'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='contacts' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 SELECT jsonb_agg(x ORDER BY x) INTO chosen FROM unnest(p_rows)x;
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM chosen OR ticket.result->>'listName' IS DISTINCT FROM trim(p_name) THEN RAISE EXCEPTION 'List selection changed'; END IF;
  RETURN ticket.result;
 END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) AND value->>'eligible'='true')<>cardinality(p_rows) THEN RAISE EXCEPTION 'Invalid selection'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'phone' LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||(item->>'phone'),0));
 END LOOP;
 INSERT INTO public.marketing_contact_lists(organization_id,name,created_by) VALUES(p_org,trim(p_name),p_actor) RETURNING id INTO list;
 FOR item IN SELECT value FROM jsonb_array_elements(ticket.payload) WHERE (value->>'row')::integer=ANY(p_rows) ORDER BY value->>'phone' LOOP
  subject:=public.marketing_import_subject(p_org,item->>'phone');
  IF subject IS DISTINCT FROM item->'subject' THEN RAISE EXCEPTION 'Recipient changed; review again'; END IF;
  IF jsonb_array_length(subject->'contacts')=0 THEN
   INSERT INTO public.leads(organization_id,name,phone,email,source,contact_type,status,marketing_opted_out,opted_out_at)
   VALUES(p_org,item->>'name',item->>'phone',nullif(item->>'email',''),'marketing_import','prospect','marketing_contact',
    subject->>'pending'='true' OR coalesce(subject->'event'->>'event'='revoked',false),
    CASE WHEN subject->>'pending'='true' OR subject->'event'->>'event'='revoked' THEN clock_timestamp() ELSE NULL END) RETURNING id INTO contact;
   created:=created+1;
  ELSE contact:=(subject->'contacts'->0->>'id')::uuid; existing:=existing+1; END IF;
  INSERT INTO public.marketing_contact_list_members(organization_id,list_id,contact_id) VALUES(p_org,list,contact);
 END LOOP;
 outcome:=jsonb_build_object('created',created,'existing',existing,'consents',0,'listId',list,'listName',trim(p_name));
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),selection=chosen,result=outcome,payload='null'::jsonb WHERE id=p_ticket;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_contact_import(uuid,uuid,uuid,integer[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_contact_import(uuid,uuid,uuid,integer[],text) TO service_role;

-- Freeze membership and consent state, including exclusions, in one statement snapshot.
CREATE FUNCTION public.marketing_list_authorization_snapshot(p_org uuid,p_list uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.marketing_contact_lists WHERE organization_id=p_org AND id=p_list) THEN RAISE EXCEPTION 'List unavailable'; END IF;
 IF (SELECT count(*) FROM public.marketing_contact_list_members WHERE organization_id=p_org AND list_id=p_list)>1000 THEN RAISE EXCEPTION 'List too large'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'phone',public.marketing_phone_key(l.phone),'subject',public.marketing_import_subject(p_org,public.marketing_phone_key(l.phone))) ORDER BY l.id),'[]') INTO result
 FROM public.marketing_contact_list_members m JOIN public.leads l ON l.organization_id=m.organization_id AND l.id=m.contact_id
 WHERE m.organization_id=p_org AND m.list_id=p_list AND l.deleted_at IS NULL;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketing_list_authorization_snapshot(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_list_authorization_snapshot(uuid,uuid) TO service_role;

CREATE FUNCTION public.prepare_marketing_list_authorization(p_org uuid,p_actor uuid,p_list uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='20s' AS $$
DECLARE snapshot jsonb; phones jsonb; ticket public.marketing_review_tickets; list_name text;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing authorization denied'; END IF;
 snapshot:=public.marketing_list_authorization_snapshot(p_org,p_list);
 SELECT name INTO list_name FROM public.marketing_contact_lists WHERE organization_id=p_org AND id=p_list;
 SELECT coalesce(jsonb_agg(phone ORDER BY phone),'[]') INTO phones FROM (
  SELECT DISTINCT item->>'phone' phone FROM jsonb_array_elements(snapshot) item WHERE item->>'phone' IS NOT NULL
   AND item->'subject'->>'pending'='false' AND coalesce(item->'subject'->'event'->>'event','') NOT IN('granted','revoked')
   AND jsonb_array_length(item->'subject'->'contacts')=1 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(item->'subject'->'contacts') c WHERE c->>'out'='true')
 ) recipients;
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'list_authorization',jsonb_build_object('listId',p_list,'snapshot',snapshot,'phones',phones)) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'listName',list_name,'contacts',jsonb_array_length(snapshot),'toAuthorize',jsonb_array_length(phones),'excluded',jsonb_array_length(snapshot)-jsonb_array_length(phones));
END $$;
REVOKE ALL ON FUNCTION public.prepare_marketing_list_authorization(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_marketing_list_authorization(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.confirm_marketing_list_authorization(p_org uuid,p_actor uuid,p_ticket uuid,p_confirmed boolean,p_reference text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' SET statement_timeout='20s' AS $$
DECLARE ticket public.marketing_review_tickets; phone text; outcome jsonb; evidence text; declaration_time timestamptz;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing authorization denied'; END IF;
 IF p_confirmed IS DISTINCT FROM true OR p_reference IS NULL OR length(p_reference)>1600 THEN RAISE EXCEPTION 'Explicit declaration required'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='list_authorization' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM jsonb_build_object('reference',trim(p_reference)) THEN RAISE EXCEPTION 'Declaration changed'; END IF;
  RETURN ticket.result;
 END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 -- Lock all recipients in canonical order before comparing consent and membership again.
 FOR phone IN SELECT DISTINCT item->>'phone' FROM jsonb_array_elements(ticket.payload->'snapshot') item WHERE item->>'phone' IS NOT NULL ORDER BY 1 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||phone,0));
 END LOOP;
 IF public.marketing_list_authorization_snapshot(p_org,(ticket.payload->>'listId')::uuid) IS DISTINCT FROM ticket.payload->'snapshot' THEN RAISE EXCEPTION 'List or permission changed; review again'; END IF;
 declaration_time:=clock_timestamp();
 evidence:='El responsable declara que obtuvo autorización externa para comunicaciones comerciales de su empresa. Fecha registrada: declaración, no fecha original de obtención. Lista '||(ticket.payload->>'listId')||'; revisión '||p_ticket::text||'. Referencia: '||trim(p_reference);
 FOR phone IN SELECT jsonb_array_elements_text(ticket.payload->'phones') LOOP
  PERFORM public.record_marketing_consent(p_org,phone,'granted','external_batch_declaration',evidence,declaration_time,p_actor);
 END LOOP;
 outcome:=jsonb_build_object('authorized',jsonb_array_length(ticket.payload->'phones'));
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),selection=jsonb_build_object('reference',trim(p_reference)),result=outcome,payload='null'::jsonb WHERE id=p_ticket;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_list_authorization(uuid,uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_list_authorization(uuid,uuid,uuid,boolean,text) TO service_role;
COMMIT;
