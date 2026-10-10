-- Review tickets are private, short-lived and bound to the authenticated actor and tenant.
BEGIN;
CREATE TABLE public.marketing_review_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('import','activation','renewal')), payload jsonb NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '10 minutes',
 used_at timestamptz, selection jsonb, result jsonb
);
ALTER TABLE public.marketing_review_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_review_tickets FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.marketing_review_tickets TO service_role;
CREATE INDEX marketing_review_expiry ON public.marketing_review_tickets(expires_at);

CREATE FUNCTION public.marketing_actor_permission(p_org uuid,p_actor uuid,p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m LEFT JOIN public.organization_roles r
 ON r.id=m.role_id AND r.organization_id=m.organization_id WHERE m.organization_id=p_org AND m.user_id=p_actor
 AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active' AND CASE
 WHEN m.permissions ? ('marketing.campaigns.'||p_permission) THEN m.permissions->>('marketing.campaigns.'||p_permission)='true'
 WHEN r.permissions ? ('marketing.campaigns.'||p_permission) THEN r.permissions->>('marketing.campaigns.'||p_permission)='true'
 ELSE m.role IN ('owner','admin') OR r.hierarchy_level=100 OR r.permissions->>'all'='true' OR m.permissions->>'all'='true' END)
$$;
REVOKE ALL ON FUNCTION public.marketing_actor_permission(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_actor_permission(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.marketing_actor_channel(p_org uuid,p_actor uuid,p_connection uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE membership record; perms jsonb; channels jsonb;
BEGIN
 SELECT m.role,r.hierarchy_level,coalesce(r.permissions,'{}')||coalesce(m.permissions,'{}') permissions INTO membership
 FROM public.organization_members m LEFT JOIN public.organization_roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
 WHERE m.organization_id=p_org AND m.user_id=p_actor AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active';
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_connection IS NULL THEN RETURN true; END IF;
 perms:=membership.permissions;
 IF membership.hierarchy_level=100 OR lower(membership.role) IN ('owner','dueño','propietario') OR perms->>'all'='true'
 OR perms->>'inbox.conversations.global_view'='true' THEN RETURN true; END IF;
 channels:=coalesce(nullif(perms->'inbox_access','null'),nullif(perms#>'{modules,inbox,inbox_access}','null'),perms#>'{inbox,inbox_access}','[]');
 RETURN coalesce(jsonb_typeof(channels)='array' AND channels ? p_connection::text,false);
END $$;
REVOKE ALL ON FUNCTION public.marketing_actor_channel(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_actor_channel(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.cleanup_marketing_reviews()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 DELETE FROM public.marketing_review_tickets WHERE id IN(SELECT id FROM public.marketing_review_tickets
 WHERE expires_at<clock_timestamp()-interval '1 day' ORDER BY expires_at LIMIT 100)
$$;
REVOKE ALL ON FUNCTION public.cleanup_marketing_reviews() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_marketing_reviews() TO service_role;

CREATE FUNCTION public.marketing_import_subject(p_org uuid,p_recipient text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('contacts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'out',marketing_opted_out,'at',opted_out_at) ORDER BY id)
 FROM public.leads WHERE organization_id=p_org AND deleted_at IS NULL AND public.marketing_phone_key(phone)=p_recipient),'[]'::jsonb),
 'event',(SELECT to_jsonb(e) FROM (SELECT id,event,occurred_at FROM public.marketing_consent_events
 WHERE organization_id=p_org AND recipient=p_recipient ORDER BY id DESC LIMIT 1)e),
 'pending',EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE organization_id=p_org AND recipient=p_recipient AND processed_at IS NULL))
$$;
REVOKE ALL ON FUNCTION public.marketing_import_subject(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_import_subject(uuid,text) TO service_role;

CREATE FUNCTION public.prepare_marketing_import(p_org uuid,p_actor uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='10s' AS $$
DECLARE item jsonb; subject jsonb; reason text; stored jsonb:='[]'; displayed jsonb:='[]'; ticket public.marketing_review_tickets;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'import') OR NOT public.marketing_actor_permission(p_org,p_actor,'execute')
 THEN RAISE EXCEPTION 'Marketing import denied'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 100
 OR (SELECT count(DISTINCT value->>'row') FROM jsonb_array_elements(p_rows))<>jsonb_array_length(p_rows) THEN RAISE EXCEPTION 'Invalid import'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  IF item->>'phone' IS NULL OR item->>'phone' !~ '^[1-9][0-9]{7,14}$' OR coalesce(length(trim(item->>'name')),0) NOT BETWEEN 1 AND 160
   OR coalesce(length(trim(item->>'source')),0) NOT BETWEEN 1 AND 120 OR coalesce(length(trim(item->>'evidence')),0) NOT BETWEEN 1 AND 2000
   OR item->>'occurredAt' IS NULL OR (item->>'occurredAt')::timestamptz>clock_timestamp()
   OR coalesce(length(item->>'email'),0)>254 THEN RAISE EXCEPTION 'Invalid import row'; END IF;
  subject:=public.marketing_import_subject(p_org,item->>'phone'); reason:=NULL;
  IF (SELECT count(*) FROM jsonb_array_elements(p_rows) WHERE value->>'phone'=item->>'phone')>1 THEN reason:='duplicate';
  ELSIF (subject->>'pending')::boolean THEN reason:='pending';
  ELSIF subject->'event'->>'event'='revoked' OR EXISTS(SELECT 1 FROM jsonb_array_elements(subject->'contacts') WHERE value->>'out'='true') THEN reason:='opted_out';
  ELSIF jsonb_array_length(subject->'contacts')>1 THEN reason:='multiple';
  ELSIF (item->>'occurredAt')::timestamptz<(subject->'event'->>'occurred_at')::timestamptz THEN reason:='stale'; END IF;
  stored:=stored||jsonb_build_array(item||jsonb_build_object('subject',subject,'eligible',reason IS NULL));
  displayed:=displayed||jsonb_build_array(jsonb_build_object('row',(item->>'row')::int,'name',item->>'name','phone',item->>'phone',
   'source',item->>'source','evidence',item->>'evidence','occurredAt',item->>'occurredAt',
   'eligible',reason IS NULL,'reason',coalesce(reason,CASE WHEN jsonb_array_length(subject->'contacts')=0 THEN 'new' ELSE 'existing' END)));
 END LOOP;
 -- Limited cleanup: temporary evidence does not become a second permanent consent ledger.
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'import',stored) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'rows',displayed);
END $$;
REVOKE ALL ON FUNCTION public.prepare_marketing_import(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_marketing_import(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.confirm_marketing_import(p_org uuid,p_actor uuid,p_ticket uuid,p_rows integer[])
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
   INSERT INTO public.leads(organization_id,name,phone,email,source) VALUES(p_org,item->>'name',item->>'phone',nullif(item->>'email',''),'marketing_import') RETURNING id INTO contact;
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

CREATE FUNCTION public.marketing_activation_recipients_fingerprint(p_org uuid,p_campaign uuid,p_frozen boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result text; filters jsonb;
BEGIN
 IF p_frozen THEN
  SELECT md5(coalesce(jsonb_agg(jsonb_build_object('id',contact_id,'name',recipient_snapshot->'name',
   'company',recipient_snapshot->'company','phone',recipient) ORDER BY recipient,contact_id),'[]'::jsonb)::text) INTO result
   FROM public.marketing_enrollments WHERE organization_id=p_org AND campaign_id=p_campaign;
 ELSE
  SELECT a.filter_config INTO filters FROM public.marketing_campaigns c JOIN public.marketing_audiences a
   ON a.id=c.audience_id AND a.organization_id=c.organization_id WHERE c.id=p_campaign AND c.organization_id=p_org;
  IF filters IS NULL THEN RETURN md5('[]'); END IF;
  SELECT md5(coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'company',company_name,'phone',recipient)
   ORDER BY recipient,id),'[]'::jsonb)::text) INTO result FROM (
   SELECT DISTINCT ON (public.marketing_phone_key(phone)) id,name,company_name,public.marketing_phone_key(phone) recipient
   FROM public.marketing_audience_candidates(p_org,filters) WHERE public.marketing_recipient_allowed(p_org,public.marketing_phone_key(phone))
   ORDER BY public.marketing_phone_key(phone),id) contacts;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketing_activation_recipients_fingerprint(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_activation_recipients_fingerprint(uuid,uuid,boolean) TO service_role;

CREATE FUNCTION public.prepare_marketing_activation_review(p_org uuid,p_actor uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE snapshot jsonb; cohort text; ticket public.marketing_review_tickets;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org) THEN RAISE EXCEPTION 'Campaign unavailable'; END IF;
 -- Counts and the recipient digest use one statement snapshot.
 SELECT public.read_marketing_activation(p_org,p_campaign),CASE WHEN status='draft'
 THEN public.marketing_activation_recipients_fingerprint(p_org,p_campaign) ELSE NULL END INTO snapshot,cohort
 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org;
 IF snapshot IS NULL THEN RAISE EXCEPTION 'Campaign unavailable'; END IF;
 IF NOT public.marketing_actor_channel(p_org,p_actor,(snapshot->'design'->'campaign'->>'connection_id')::uuid) THEN RAISE EXCEPTION 'Marketing channel access denied'; END IF;
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload)
 VALUES(p_org,p_actor,'activation',jsonb_build_object('campaign',p_campaign,'fingerprint',snapshot->>'fingerprint',
 'recipients',cohort)) RETURNING * INTO ticket;
 RETURN snapshot||jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.prepare_marketing_activation_review(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_marketing_activation_review(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.confirm_marketing_activation_review(p_org uuid,p_actor uuid,p_campaign uuid,p_ticket uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ticket public.marketing_review_tickets; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='activation' FOR UPDATE;
 IF NOT FOUND OR ticket.payload->>'campaign' IS DISTINCT FROM p_campaign::text THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 IF NOT public.marketing_actor_channel(p_org,p_actor,(SELECT connection_id FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org)) THEN RAISE EXCEPTION 'Marketing channel access denied'; END IF;
 IF ticket.used_at IS NOT NULL THEN RETURN ticket.result; END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 PERFORM 1 FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org FOR UPDATE;
 IF ticket.payload->>'recipients' IS NOT NULL AND public.marketing_activation_recipients_fingerprint(p_org,p_campaign)
 IS DISTINCT FROM ticket.payload->>'recipients' THEN RAISE EXCEPTION 'Recipients changed; review again'; END IF;
 outcome:=public.activate_marketing_campaign(p_org,p_campaign,ticket.payload->>'fingerprint',p_actor);
 -- Compare what was actually frozen, so concurrent additions/edits cannot expand the reviewed cohort.
 IF ticket.payload->>'recipients' IS NOT NULL AND public.marketing_activation_recipients_fingerprint(p_org,p_campaign,true)
 IS DISTINCT FROM ticket.payload->>'recipients' THEN RAISE EXCEPTION 'Recipients changed during activation'; END IF;
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),result=outcome WHERE id=ticket.id;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_activation_review(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_activation_review(uuid,uuid,uuid,uuid) TO service_role;
CREATE FUNCTION public.prepare_marketing_renewal(p_org uuid,p_actor uuid,p_recipient text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE subject jsonb; boundary timestamptz; ticket public.marketing_review_tickets;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 subject:=public.marketing_import_subject(p_org,p_recipient);
 IF jsonb_array_length(subject->'contacts')=0 OR subject->>'pending'='true' THEN RAISE EXCEPTION 'Recipient unavailable or pending opt-out'; END IF;
 IF subject->'event'->>'event' IS DISTINCT FROM 'revoked' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(subject->'contacts') WHERE value->>'out'='true') THEN RAISE EXCEPTION 'No withdrawal to renew'; END IF;
 SELECT greatest((subject->'event'->>'occurred_at')::timestamptz,max((value->>'at')::timestamptz)) INTO boundary FROM jsonb_array_elements(subject->'contacts');
 boundary:=coalesce(boundary,clock_timestamp());
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'renewal',
 jsonb_build_object('recipient',p_recipient,'subject',subject,'after',boundary)) RETURNING * INTO ticket;
 RETURN jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at,'after',boundary);
END $$;
REVOKE ALL ON FUNCTION public.prepare_marketing_renewal(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_marketing_renewal(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.confirm_marketing_renewal(p_org uuid,p_actor uuid,p_ticket uuid,p_source text,p_evidence text,p_occurred_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='2s' AS $$
DECLARE ticket public.marketing_review_tickets; recipient_key text; event_id bigint; checksum jsonb; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='renewal' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 checksum:=to_jsonb(md5(jsonb_build_array(p_source,p_evidence,p_occurred_at)::text));
 IF ticket.used_at IS NOT NULL THEN
  IF ticket.selection IS DISTINCT FROM checksum THEN RAISE EXCEPTION 'Renewal changed'; END IF;
  RETURN ticket.result; END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 IF coalesce(length(trim(p_source)),0) NOT BETWEEN 1 AND 120 OR coalesce(length(trim(p_evidence)),0) NOT BETWEEN 1 AND 2000
 OR p_occurred_at IS NULL OR p_occurred_at>clock_timestamp() OR p_occurred_at<=(ticket.payload->>'after')::timestamptz THEN RAISE EXCEPTION 'New consent must follow withdrawal'; END IF;
 recipient_key:=ticket.payload->>'recipient';
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||recipient_key,0));
 IF public.marketing_import_subject(p_org,recipient_key) IS DISTINCT FROM ticket.payload->'subject' THEN RAISE EXCEPTION 'Recipient changed; review again'; END IF;
 IF EXISTS(SELECT 1 FROM public.marketing_opt_out_receipts WHERE organization_id=p_org AND recipient=recipient_key AND processed_at IS NULL) THEN RAISE EXCEPTION 'Pending opt-out'; END IF;
 -- Append evidence and clear only withdrawal flags; cancelled campaigns are never restarted.
 INSERT INTO public.marketing_consent_events(organization_id,recipient,event,source,evidence,occurred_at,recorded_by)
 VALUES(p_org,recipient_key,'granted',p_source,p_evidence,p_occurred_at,p_actor) RETURNING id INTO event_id;
 UPDATE public.leads SET marketing_opted_out=false,opted_out_at=NULL WHERE organization_id=p_org AND deleted_at IS NULL AND public.marketing_phone_key(phone)=recipient_key;
 outcome:=jsonb_build_object('eventId',event_id);
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),selection=checksum,result=outcome,payload='null'::jsonb WHERE id=ticket.id;
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.confirm_marketing_renewal(uuid,uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_marketing_renewal(uuid,uuid,uuid,text,text,timestamptz) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
