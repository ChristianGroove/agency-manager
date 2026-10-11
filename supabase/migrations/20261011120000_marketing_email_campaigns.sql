-- Additive SMTP campaigns. WhatsApp continues through the existing v2 contracts.
BEGIN;
ALTER TABLE public.marketing_campaigns ADD COLUMN channel text NOT NULL DEFAULT 'whatsapp' CHECK(channel IN ('whatsapp','email')),
 ADD COLUMN smtp_config_id uuid;
CREATE TABLE public.marketing_email_permissions (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 recipient text NOT NULL, granted_at timestamptz, revoked_at timestamptz, actor uuid, reference text,
 PRIMARY KEY(organization_id,recipient));
CREATE TABLE public.marketing_email_pacing (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 smtp_config_id uuid NOT NULL, next_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,smtp_config_id));
CREATE TABLE public.marketing_email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id), enrollment_id uuid NOT NULL REFERENCES public.marketing_enrollments(id),
 step_id uuid NOT NULL REFERENCES public.marketing_steps(id), recipient text NOT NULL,
 status text NOT NULL DEFAULT 'sending' CHECK(status IN ('sending','accepted','failed','unknown')),
 provider_id text, error_kind text, unsubscribe_token text NOT NULL, unsubscribe_hash text NOT NULL UNIQUE,
 claimed_until timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(enrollment_id,step_id));
CREATE INDEX marketing_email_outbox_campaign ON public.marketing_email_outbox(organization_id,campaign_id,enrollment_id);
CREATE INDEX marketing_email_outbox_recipient ON public.marketing_email_outbox(organization_id,recipient,created_at DESC) WHERE status IN ('sending','accepted','unknown');
CREATE INDEX marketing_email_outbox_expiring ON public.marketing_email_outbox(claimed_until) WHERE status='sending';
ALTER TABLE public.marketing_email_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_pacing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_email_permissions,public.marketing_email_pacing,public.marketing_email_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.marketing_email_permissions,public.marketing_email_pacing,public.marketing_email_outbox TO service_role;
ALTER TABLE public.marketing_review_tickets DROP CONSTRAINT marketing_review_tickets_kind_check;
ALTER TABLE public.marketing_review_tickets ADD CONSTRAINT marketing_review_tickets_kind_check
 CHECK(kind IN ('import','activation','renewal','contacts','list_authorization','email_activation','email_authorization','email_import'));

CREATE FUNCTION public.marketing_email_key(p_email text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN length(trim(p_email))<=254 AND lower(trim(p_email)) ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$'
 THEN lower(trim(p_email)) END
$$;
CREATE INDEX marketing_contact_email_key ON public.leads(organization_id,public.marketing_email_key(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE FUNCTION public.marketing_email_allowed(p_org uuid,p_email text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(public.marketing_email_key(p_email)=p_email AND EXISTS(SELECT 1 FROM public.marketing_email_permissions
 WHERE organization_id=p_org AND recipient=p_email AND granted_at IS NOT NULL AND revoked_at IS NULL),false)
$$;
CREATE FUNCTION public.marketing_email_smtp_fingerprint(p_org uuid,p_smtp uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT md5(jsonb_build_array(id,host,port,user_email,password_encrypted,iv,from_email,from_name,is_verified)::text)
 FROM public.organization_smtp_configs WHERE organization_id=p_org AND id=p_smtp AND is_verified=true
$$;
CREATE FUNCTION public.marketing_email_campaign_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.channel='email' AND NEW.connection_id IS NOT NULL THEN RAISE EXCEPTION 'Email cannot use a Meta connection'; END IF;
 IF NEW.channel='whatsapp' AND NEW.smtp_config_id IS NOT NULL THEN RAISE EXCEPTION 'WhatsApp cannot use an SMTP sender'; END IF;
 IF NEW.smtp_config_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.smtp_config_id IS DISTINCT FROM OLD.smtp_config_id)
 AND NOT EXISTS(SELECT 1 FROM public.organization_smtp_configs WHERE id=NEW.smtp_config_id AND organization_id=NEW.organization_id AND is_verified=true)
 THEN RAISE EXCEPTION 'SMTP sender unavailable'; END IF;
 IF TG_OP='UPDATE' AND OLD.execution_version IS NOT NULL AND (NEW.channel IS DISTINCT FROM OLD.channel OR NEW.smtp_config_id IS DISTINCT FROM OLD.smtp_config_id)
 THEN RAISE EXCEPTION 'Campaign sender is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER marketing_email_campaign_guard BEFORE INSERT OR UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.marketing_email_campaign_guard();

CREATE FUNCTION public.marketing_email_cohort(p_org uuid,p_filters jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'name',name,'company',company_name) ORDER BY email,id),'[]') FROM (
 SELECT DISTINCT ON(public.marketing_email_key(email)) id,public.marketing_email_key(email) email,name,company_name
 FROM public.marketing_audience_candidates(p_org,p_filters)
 WHERE public.marketing_email_allowed(p_org,public.marketing_email_key(email)) ORDER BY public.marketing_email_key(email),id) q
$$;
CREATE FUNCTION public.marketing_email_audience_summary(p_org uuid,p_filters jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND NOT public.marketing_has_permission(p_org,'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 WITH candidates AS MATERIALIZED(SELECT *,public.marketing_email_key(email) email_address FROM public.marketing_audience_candidates(p_org,p_filters)),
 marked AS(SELECT *,public.marketing_email_allowed(p_org,email_address) allowed,EXISTS(SELECT 1 FROM public.marketing_email_permissions p WHERE p.organization_id=p_org AND p.recipient=email_address AND p.revoked_at IS NOT NULL) withdrawn FROM candidates)
 SELECT jsonb_build_object('matched',count(*),'eligible',count(DISTINCT email_address) FILTER(WHERE allowed),
 'duplicates',count(*) FILTER(WHERE allowed)-count(DISTINCT email_address) FILTER(WHERE allowed),
 'invalidFormat',count(*) FILTER(WHERE email_address IS NULL),'optedOut',count(*) FILTER(WHERE withdrawn),
 'missingConsent',count(*) FILTER(WHERE email_address IS NOT NULL AND NOT allowed AND NOT withdrawn)) INTO result FROM marked;
 RETURN result;
END $$;
CREATE FUNCTION public.read_marketing_email_preflight(p_org uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp public.marketing_campaigns; design jsonb; filters jsonb; cohort jsonb; smtp record; missing integer;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND NOT public.marketing_has_permission(p_org,'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email';
 IF NOT FOUND THEN RAISE EXCEPTION 'Email campaign unavailable'; END IF;
 SELECT from_email,from_name,is_verified,port INTO smtp FROM public.organization_smtp_configs WHERE id=camp.smtp_config_id AND organization_id=p_org;
 SELECT filter_config INTO filters FROM public.marketing_audiences WHERE id=camp.audience_id AND organization_id=p_org;
 cohort:=CASE WHEN filters IS NULL THEN '[]'::jsonb ELSE public.marketing_email_cohort(p_org,filters) END;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'is_active',s.is_active,'steps',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY order_index,id) FROM public.marketing_steps t WHERE t.sequence_id=s.id AND t.organization_id=p_org),'[]')) ORDER BY s.id),'[]') INTO design
 FROM public.marketing_sequences s WHERE s.campaign_id=p_campaign AND s.organization_id=p_org;
 SELECT count(*) INTO missing FROM jsonb_array_elements(cohort) r WHERE EXISTS(SELECT 1 FROM public.marketing_steps t JOIN public.marketing_sequences q ON q.id=t.sequence_id WHERE q.organization_id=p_org AND q.campaign_id=p_campaign AND q.is_active AND t.type='email' AND (((t.content->>'subject')||' '||(t.content->>'body') LIKE '%{{nombre}}%' AND nullif(trim(r->>'name'),'') IS NULL) OR ((t.content->>'subject')||' '||(t.content->>'body') LIKE '%{{empresa}}%' AND nullif(trim(r->>'company'),'') IS NULL)));
 RETURN jsonb_build_object('campaign',to_jsonb(camp),'channel',CASE WHEN smtp IS NULL THEN NULL ELSE jsonb_build_object('name',smtp.from_name||' · '||smtp.from_email,'provider','smtp','status',CASE WHEN smtp.is_verified AND smtp.port IN(465,587) THEN 'active' ELSE 'inactive' END) END,
 'sequences',design,'templates','[]'::jsonb,'audience',CASE WHEN filters IS NULL THEN NULL ELSE public.marketing_email_audience_summary(p_org,filters) END,'missingData',missing);
END $$;
CREATE FUNCTION public.marketing_email_activation_snapshot(p_org uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp public.marketing_campaigns; design jsonb; cohort jsonb; filters jsonb;
BEGIN
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email';
 IF NOT FOUND THEN RAISE EXCEPTION 'Email campaign unavailable'; END IF;
 SELECT filter_config INTO filters FROM public.marketing_audiences WHERE id=camp.audience_id AND organization_id=p_org;
 IF camp.execution_version=3 THEN
  SELECT coalesce(jsonb_agg(recipient_snapshot||jsonb_build_object('id',contact_id,'email',recipient) ORDER BY recipient,contact_id),'[]') INTO cohort FROM public.marketing_enrollments WHERE campaign_id=p_campaign AND organization_id=p_org;
 ELSE cohort:=CASE WHEN filters IS NULL THEN '[]'::jsonb ELSE public.marketing_email_cohort(p_org,filters) END; END IF;
 design:=public.read_marketing_email_preflight(p_org,p_campaign);
 -- Do not fingerprint volatile metrics or timestamps.
 RETURN jsonb_build_object('review',design,'cohort',cohort,'fingerprint',md5(jsonb_build_array(camp.id,camp.channel,camp.smtp_config_id,camp.audience_id,camp.delivery_config,camp.scheduled_for,
 design->'sequences',filters,cohort,public.marketing_email_smtp_fingerprint(p_org,camp.smtp_config_id))::text));
END $$;
CREATE FUNCTION public.prepare_marketing_email_activation(p_org uuid,p_actor uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE snapshot jsonb; ticket public.marketing_review_tickets;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 snapshot:=public.marketing_email_activation_snapshot(p_org,p_campaign);
 PERFORM public.cleanup_marketing_reviews();
 INSERT INTO public.marketing_review_tickets(organization_id,actor,kind,payload) VALUES(p_org,p_actor,'email_activation',jsonb_build_object('campaign',p_campaign,'fingerprint',snapshot->>'fingerprint')) RETURNING * INTO ticket;
 RETURN snapshot||jsonb_build_object('token',ticket.id,'expiresAt',ticket.expires_at);
END $$;
CREATE FUNCTION public.confirm_marketing_email_activation(p_org uuid,p_actor uuid,p_campaign uuid,p_ticket uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='3s' AS $$
DECLARE ticket public.marketing_review_tickets; camp public.marketing_campaigns; snapshot jsonb; cohort jsonb; smtp_hash text; seq uuid; first_step uuid; item jsonb; count_steps integer; outcome jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,p_actor,'execute') OR NOT public.marketing_actor_permission(p_org,p_actor,'view') THEN RAISE EXCEPTION 'Marketing execution denied'; END IF;
 SELECT * INTO ticket FROM public.marketing_review_tickets WHERE id=p_ticket AND organization_id=p_org AND actor=p_actor AND kind='email_activation' FOR UPDATE;
 IF NOT FOUND OR ticket.payload->>'campaign' IS DISTINCT FROM p_campaign::text THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 IF ticket.used_at IS NOT NULL THEN RETURN ticket.result; END IF;
 IF ticket.expires_at<clock_timestamp() THEN RAISE EXCEPTION 'Review expired'; END IF;
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org AND channel='email' FOR UPDATE;
 IF NOT FOUND OR camp.status NOT IN('draft','paused','active') THEN RAISE EXCEPTION 'Campaign unavailable'; END IF;
 -- Lock the sender while comparing the reviewed settings and publishing the snapshot.
 PERFORM 1 FROM public.organization_smtp_configs WHERE id=camp.smtp_config_id AND organization_id=p_org FOR SHARE;
 snapshot:=public.marketing_email_activation_snapshot(p_org,p_campaign);
 IF snapshot->>'fingerprint' IS DISTINCT FROM ticket.payload->>'fingerprint' THEN RAISE EXCEPTION 'Design or recipients changed; review again'; END IF;
 smtp_hash:=public.marketing_email_smtp_fingerprint(p_org,camp.smtp_config_id);
 IF smtp_hash IS NULL OR snapshot#>>'{review,channel,status}' IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'SMTP sender unavailable'; END IF;
 IF camp.delivery_config->>'mode' IS NULL OR camp.delivery_config->>'timezone' IS NULL OR camp.delivery_config->>'recipient_cooldown_hours' IS NULL OR camp.delivery_config->>'mode' NOT IN('stealth','growth','turbo') OR NOT (camp.delivery_config ? 'timezone')
 OR (camp.delivery_config->>'recipient_cooldown_hours')::integer NOT BETWEEN 0 AND 720 THEN RAISE EXCEPTION 'Invalid email schedule'; END IF;
 PERFORM public.marketing_schedule_open(camp.delivery_config,clock_timestamp());
 IF (SELECT count(*) FROM public.marketing_sequences WHERE campaign_id=p_campaign AND organization_id=p_org AND is_active)<>1 THEN RAISE EXCEPTION 'One principal sequence is required'; END IF;
 SELECT id INTO seq FROM public.marketing_sequences WHERE campaign_id=p_campaign AND organization_id=p_org AND is_active;
 SELECT count(*) INTO count_steps FROM public.marketing_steps WHERE sequence_id=seq AND organization_id=p_org;
 IF count_steps=0 OR NOT EXISTS(SELECT 1 FROM public.marketing_steps WHERE sequence_id=seq AND organization_id=p_org AND type='email') OR count_steps<>(SELECT count(DISTINCT order_index) FROM public.marketing_steps WHERE sequence_id=seq AND organization_id=p_org) THEN RAISE EXCEPTION 'Invalid email sequence'; END IF;
 FOR item IN SELECT to_jsonb(t) FROM public.marketing_steps t WHERE sequence_id=seq AND organization_id=p_org LOOP
  IF item->>'type'='delay' THEN
   IF item#>>'{delay_config,value}' IS NULL OR item#>>'{delay_config,unit}' IS NULL OR (item#>>'{delay_config,value}')::numeric NOT BETWEEN 1 AND 365 OR item#>>'{delay_config,unit}' NOT IN('minutes','hours','days') THEN RAISE EXCEPTION 'Invalid delay'; END IF;
  ELSIF item->>'type'='email' THEN
   IF item#>>'{content,subject}' IS NULL OR item#>>'{content,body}' IS NULL OR length(trim(item#>>'{content,subject}')) NOT BETWEEN 1 AND 200 OR item#>>'{content,subject}' ~ '[\r\n]' OR length(trim(item#>>'{content,body}')) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'Invalid email content'; END IF;
   IF regexp_replace((item#>>'{content,subject}')||' '||(item#>>'{content,body}'),'\{\{(nombre|empresa|email)\}\}','', 'g') ~ '\{\{|\}\}' THEN RAISE EXCEPTION 'Unsupported email variables'; END IF;
  ELSE RAISE EXCEPTION 'Unsupported email step'; END IF;
 END LOOP;
 cohort:=snapshot->'cohort';
 IF camp.execution_version IS NULL THEN
  IF (snapshot#>>'{review,missingData}')::integer>0 THEN RAISE EXCEPTION 'Recipients lack email personalization data'; END IF;
  IF jsonb_array_length(cohort)=0 THEN RAISE EXCEPTION 'No authorized email recipients'; END IF;
  SELECT id INTO first_step FROM public.marketing_steps WHERE sequence_id=seq AND organization_id=p_org ORDER BY order_index,id LIMIT 1;
  INSERT INTO public.marketing_enrollments(organization_id,campaign_id,sequence_id,contact_id,current_step_id,status,recipient,recipient_snapshot,next_run_at)
  SELECT p_org,p_campaign,seq,(value->>'id')::uuid,first_step,'active',value->>'email',value,greatest(clock_timestamp(),coalesce(camp.scheduled_for,clock_timestamp())) FROM jsonb_array_elements(cohort);
  -- A concurrent permission/audience edit cannot expand the reviewed cohort.
  IF public.marketing_email_cohort(p_org,(SELECT filter_config FROM public.marketing_audiences WHERE id=camp.audience_id AND organization_id=p_org)) IS DISTINCT FROM cohort THEN RAISE EXCEPTION 'Recipients changed during activation'; END IF;
  UPDATE public.marketing_campaigns SET status='active',execution_version=3,execution_snapshot=jsonb_build_object('smtpFingerprint',smtp_hash,'design',snapshot->'review'),updated_at=clock_timestamp() WHERE id=p_campaign AND organization_id=p_org;
 ELSE
  IF camp.execution_version<>3 OR camp.execution_snapshot->>'smtpFingerprint' IS DISTINCT FROM smtp_hash THEN RAISE EXCEPTION 'Sender changed after activation'; END IF;
  UPDATE public.marketing_campaigns SET status='active',updated_at=clock_timestamp() WHERE id=p_campaign AND organization_id=p_org;
 END IF;
 outcome:=jsonb_build_object('enrolled',jsonb_array_length(cohort));
 UPDATE public.marketing_review_tickets SET used_at=clock_timestamp(),result=outcome WHERE id=p_ticket;
 RETURN outcome;
END $$;

CREATE FUNCTION public.claim_marketing_email_enrollments(p_limit integer) RETURNS SETOF public.marketing_enrollments LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH picked AS(SELECT e.id FROM public.marketing_enrollments e JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id
 WHERE e.status='active' AND c.status='active' AND c.channel='email' AND c.execution_version=3 AND coalesce(e.next_run_at,now())<=now()
 AND (e.claimed_until IS NULL OR e.claimed_until<now()) AND coalesce(c.scheduled_for,now())<=now()
 ORDER BY e.next_run_at NULLS FIRST,e.id LIMIT greatest(1,least(p_limit,25)) FOR UPDATE OF e SKIP LOCKED)
 UPDATE public.marketing_enrollments e SET claim_token=gen_random_uuid(),claimed_until=now()+interval '2 minutes' FROM picked WHERE e.id=picked.id RETURNING e.*
$$;
ALTER FUNCTION public.claim_marketing_enrollments(integer) RENAME TO claim_marketing_enrollments_before_email;
CREATE FUNCTION public.claim_marketing_enrollments(p_limit integer DEFAULT 25) RETURNS SETOF public.marketing_enrollments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE remaining integer; used integer;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'Invalid claim limit'; END IF;
 -- Keep all WhatsApp capacity when no email work is due.
 IF NOT EXISTS(SELECT 1 FROM public.marketing_enrollments e JOIN public.marketing_campaigns c ON c.id=e.campaign_id AND c.organization_id=e.organization_id WHERE c.channel='email' AND c.execution_version=3 AND c.status='active' AND e.status='active' AND coalesce(e.next_run_at,now())<=now()) THEN
  RETURN QUERY SELECT * FROM public.claim_marketing_enrollments_before_email(p_limit); RETURN;
 END IF;
 remaining:=greatest(1,p_limit/2);
 IF mod(extract(epoch FROM clock_timestamp())::bigint,2)=0 THEN
  RETURN QUERY SELECT * FROM public.claim_marketing_email_enrollments(remaining); GET DIAGNOSTICS used=ROW_COUNT;
  IF used<p_limit THEN RETURN QUERY SELECT * FROM public.claim_marketing_enrollments_before_email(p_limit-used); END IF;
 ELSE
  RETURN QUERY SELECT * FROM public.claim_marketing_enrollments_before_email(remaining); GET DIAGNOSTICS used=ROW_COUNT;
  IF used<p_limit THEN RETURN QUERY SELECT * FROM public.claim_marketing_email_enrollments(p_limit-used); END IF;
 END IF;
END $$;

CREATE FUNCTION public.reserve_marketing_email(p_org uuid,p_enrollment uuid,p_step uuid,p_claim uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='3s' AS $$
DECLARE camp public.marketing_campaigns; enrollment public.marketing_enrollments; previous public.marketing_email_outbox; pacing public.marketing_email_pacing; token text; cooldown integer; prior_at timestamptz; prior_wait integer;
BEGIN
 SELECT c.* INTO camp FROM public.marketing_campaigns c JOIN public.marketing_enrollments e ON e.campaign_id=c.id AND e.organization_id=c.organization_id WHERE e.id=p_enrollment AND e.organization_id=p_org FOR UPDATE OF c;
 SELECT * INTO enrollment FROM public.marketing_enrollments WHERE id=p_enrollment AND organization_id=p_org AND claim_token=p_claim AND claimed_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND OR camp.status<>'active' OR camp.channel<>'email' OR camp.execution_version<>3 OR enrollment.status<>'active' OR enrollment.current_step_id<>p_step THEN RAISE EXCEPTION 'Email job unavailable'; END IF;
 SELECT * INTO previous FROM public.marketing_email_outbox WHERE enrollment_id=p_enrollment AND step_id=p_step AND organization_id=p_org;
 IF FOUND THEN
  IF previous.status='sending' AND previous.claimed_until<clock_timestamp() THEN UPDATE public.marketing_email_outbox SET status='unknown',error_kind='smtp_unconfirmed',updated_at=clock_timestamp() WHERE id=previous.id RETURNING * INTO previous; END IF;
  RETURN jsonb_build_object('state',previous.status,'id',previous.id,'providerId',previous.provider_id);
 END IF;
 IF NOT public.marketing_email_allowed(p_org,enrollment.recipient) THEN RETURN jsonb_build_object('state','cancelled'); END IF;
 IF NOT public.marketing_schedule_open(camp.delivery_config,clock_timestamp()) THEN RETURN jsonb_build_object('state','deferred','retryAt',clock_timestamp()+interval '5 minutes'); END IF;
 IF public.marketing_email_smtp_fingerprint(p_org,camp.smtp_config_id) IS DISTINCT FROM camp.execution_snapshot->>'smtpFingerprint' THEN RAISE EXCEPTION 'SMTP configuration changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.leads WHERE id=enrollment.contact_id AND organization_id=p_org AND deleted_at IS NULL AND public.marketing_email_key(email)=enrollment.recipient) THEN RETURN jsonb_build_object('state','cancelled'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('email:'||p_org::text||':'||enrollment.recipient,0));
 IF NOT public.marketing_email_allowed(p_org,enrollment.recipient) THEN RETURN jsonb_build_object('state','cancelled'); END IF;
 cooldown:=coalesce((camp.delivery_config->>'recipient_cooldown_hours')::integer,0);
 SELECT o.created_at,coalesce((c.delivery_config->>'recipient_cooldown_hours')::integer,0) INTO prior_at,prior_wait FROM public.marketing_email_outbox o JOIN public.marketing_campaigns c ON c.id=o.campaign_id AND c.organization_id=p_org
 WHERE o.organization_id=p_org AND o.recipient=enrollment.recipient AND o.campaign_id<>camp.id AND o.status='accepted' ORDER BY o.created_at DESC LIMIT 1;
 IF prior_at IS NOT NULL AND prior_at+make_interval(hours=>greatest(prior_wait,cooldown))>clock_timestamp() THEN RETURN jsonb_build_object('state','deferred','retryAt',prior_at+make_interval(hours=>greatest(prior_wait,cooldown))); END IF;
 IF EXISTS(SELECT 1 FROM public.marketing_email_outbox WHERE organization_id=p_org AND recipient=enrollment.recipient AND status IN('sending','unknown')) THEN RETURN jsonb_build_object('state','deferred','retryAt',clock_timestamp()+interval '5 minutes'); END IF;
 INSERT INTO public.marketing_email_pacing(organization_id,smtp_config_id) VALUES(p_org,camp.smtp_config_id) ON CONFLICT DO NOTHING;
 SELECT * INTO pacing FROM public.marketing_email_pacing WHERE organization_id=p_org AND smtp_config_id=camp.smtp_config_id FOR UPDATE;
 IF pacing.next_at>clock_timestamp() THEN RETURN jsonb_build_object('state','deferred','retryAt',pacing.next_at); END IF;
 UPDATE public.marketing_email_pacing SET next_at=clock_timestamp()+make_interval(secs=>CASE camp.delivery_config->>'mode' WHEN 'stealth' THEN 180 WHEN 'turbo' THEN 5 ELSE 30 END * (1 + CASE WHEN camp.delivery_config->>'humanize'='true' THEN random()*0.35 ELSE 0 END)) WHERE organization_id=p_org AND smtp_config_id=camp.smtp_config_id;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.marketing_email_outbox(organization_id,campaign_id,enrollment_id,step_id,recipient,unsubscribe_token,unsubscribe_hash,claimed_until)
 VALUES(p_org,camp.id,p_enrollment,p_step,enrollment.recipient,token,encode(extensions.digest(token,'sha256'),'hex'),clock_timestamp()+interval '2 minutes') RETURNING * INTO previous;
 RETURN jsonb_build_object('state','reserved','id',previous.id,'unsubscribeToken',token);
END $$;
CREATE FUNCTION public.finish_marketing_email(p_org uuid,p_outbox uuid,p_status text,p_provider text DEFAULT NULL,p_error text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_status IS NULL OR (p_status='accepted' AND nullif(p_provider,'') IS NULL) OR p_status NOT IN('accepted','failed','unknown') OR length(coalesce(p_provider,''))>500 OR length(coalesce(p_error,''))>100 THEN RAISE EXCEPTION 'Invalid email result'; END IF;
 UPDATE public.marketing_email_outbox SET status=p_status,provider_id=p_provider,error_kind=p_error,updated_at=clock_timestamp() WHERE id=p_outbox AND organization_id=p_org AND status IN('sending','unknown');
 RETURN FOUND;
END $$;
CREATE FUNCTION public.unsubscribe_marketing_email(p_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE delivery public.marketing_email_outbox;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 SELECT * INTO delivery FROM public.marketing_email_outbox WHERE unsubscribe_hash=p_hash;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('email:'||delivery.organization_id::text||':'||delivery.recipient,0));
 INSERT INTO public.marketing_email_permissions(organization_id,recipient,revoked_at,reference) VALUES(delivery.organization_id,delivery.recipient,clock_timestamp(),'email_unsubscribe') ON CONFLICT(organization_id,recipient) DO UPDATE SET revoked_at=clock_timestamp(),reference='email_unsubscribe';
 -- Do not take campaign/enrollment locks here: the final reservation reads this suppression.
 RETURN true;
END $$;
CREATE FUNCTION public.finalize_marketing_email_campaigns(p_limit integer DEFAULT 25) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE camp record; closed integer:=0;
BEGIN
 UPDATE public.marketing_email_outbox SET status='unknown',error_kind='smtp_unconfirmed',updated_at=clock_timestamp() WHERE status='sending' AND claimed_until<clock_timestamp();
 FOR camp IN SELECT c.id,c.organization_id FROM public.marketing_campaigns c WHERE c.channel='email' AND c.execution_version=3 AND c.status='active'
 AND EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id=c.id AND organization_id=c.organization_id)
 AND NOT EXISTS(SELECT 1 FROM public.marketing_enrollments WHERE campaign_id=c.id AND organization_id=c.organization_id AND status='active')
 AND NOT EXISTS(SELECT 1 FROM public.marketing_email_outbox WHERE campaign_id=c.id AND organization_id=c.organization_id AND status IN('sending','unknown'))
 LIMIT greatest(1,least(p_limit,25)) FOR UPDATE OF c SKIP LOCKED LOOP
  UPDATE public.marketing_campaigns SET status='completed' WHERE id=camp.id AND organization_id=camp.organization_id; closed:=closed+1;
 END LOOP; RETURN closed;
END $$;

-- Private worker boundaries. Read functions are the only authenticated RPCs.
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN(
 'marketing_email_key','marketing_email_allowed','marketing_email_smtp_fingerprint','marketing_email_campaign_guard','marketing_email_cohort','marketing_email_audience_summary','read_marketing_email_preflight',
 'marketing_email_activation_snapshot','prepare_marketing_email_activation','confirm_marketing_email_activation','claim_marketing_email_enrollments','claim_marketing_enrollments_before_email','claim_marketing_enrollments',
 'reserve_marketing_email','finish_marketing_email','unsubscribe_marketing_email','finalize_marketing_email_campaigns') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.marketing_email_audience_summary(uuid,jsonb),public.read_marketing_email_preflight(uuid,uuid) TO authenticated;
COMMIT;
