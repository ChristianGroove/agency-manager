BEGIN;
CREATE FUNCTION public.save_marketing_campaign_emitter(p_org uuid,p_campaign uuid,p_channel text,p_sender uuid,p_reset boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET lock_timeout='3s' AS $$
DECLARE camp public.marketing_campaigns;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'manage') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 SELECT * INTO camp FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org FOR UPDATE;
 IF NOT FOUND OR camp.status<>'draft' OR camp.execution_version IS NOT NULL THEN RAISE EXCEPTION 'Campaign is protected'; END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('whatsapp','email') OR p_sender IS NULL OR p_reset IS NULL THEN RAISE EXCEPTION 'Invalid sender'; END IF;
 IF p_channel='email' THEN
  IF NOT EXISTS(SELECT 1 FROM public.organization_smtp_configs WHERE id=p_sender AND organization_id=p_org AND is_verified AND port IN(465,587)) THEN RAISE EXCEPTION 'SMTP unavailable'; END IF;
 ELSE
  IF NOT public.marketing_actor_channel(p_org,auth.uid(),p_sender) OR NOT EXISTS(SELECT 1 FROM public.integration_connections WHERE id=p_sender AND organization_id=p_org AND provider_key IN('whatsapp_cloud','meta_whatsapp') AND status='active') THEN RAISE EXCEPTION 'Channel unavailable'; END IF;
 END IF;
 IF camp.channel<>p_channel AND EXISTS(SELECT 1 FROM public.marketing_steps s JOIN public.marketing_sequences q ON q.id=s.sequence_id WHERE q.campaign_id=p_campaign AND q.organization_id=p_org) THEN
  IF NOT p_reset THEN RAISE EXCEPTION 'Confirm message reset before changing channel'; END IF;
  DELETE FROM public.marketing_steps s USING public.marketing_sequences q WHERE s.sequence_id=q.id AND q.campaign_id=p_campaign AND q.organization_id=p_org;
 END IF;
 UPDATE public.marketing_campaigns SET channel=p_channel,connection_id=CASE WHEN p_channel='whatsapp' THEN p_sender END,smtp_config_id=CASE WHEN p_channel='email' THEN p_sender END,updated_at=clock_timestamp() WHERE id=p_campaign AND organization_id=p_org;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_marketing_campaign_emitter(uuid,uuid,text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_marketing_campaign_emitter(uuid,uuid,text,uuid,boolean) TO authenticated;

ALTER FUNCTION public.read_marketing_preflight(uuid,uuid) RENAME TO read_marketing_preflight_before_email;
ALTER FUNCTION public.read_marketing_campaign_metrics(uuid,uuid) RENAME TO read_marketing_campaign_metrics_before_email;
ALTER FUNCTION public.read_marketing_history(uuid,uuid,text,text,text,uuid,integer,boolean) RENAME TO read_marketing_history_before_email;
ALTER FUNCTION public.read_marketing_step_history(uuid,uuid,uuid,text,text,text,jsonb,integer,boolean) RENAME TO read_marketing_step_history_before_email;
CREATE FUNCTION public.read_marketing_preflight(p_org uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id=p_campaign AND channel='email') THEN RETURN public.read_marketing_email_preflight(p_org,p_campaign); END IF;
 RETURN public.read_marketing_preflight_before_email(p_org,p_campaign);
END $$;
CREATE FUNCTION public.read_marketing_campaign_metrics(p_org uuid,p_campaign uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id=p_campaign AND channel='email') THEN RETURN public.read_marketing_email_metrics(p_org,p_campaign); END IF;
 RETURN public.read_marketing_campaign_metrics_before_email(p_org,p_campaign);
END $$;
CREATE FUNCTION public.read_marketing_history(p_org uuid,p_campaign uuid,p_status text DEFAULT 'all',p_search text DEFAULT '',p_delivery text DEFAULT 'all',p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id=p_campaign AND channel='email') THEN RETURN public.read_marketing_email_history(p_org,p_campaign,p_status,p_search,p_delivery,p_after,p_limit,p_export); END IF;
 RETURN public.read_marketing_history_before_email(p_org,p_campaign,p_status,p_search,p_delivery,p_after,p_limit,p_export);
END $$;
CREATE FUNCTION public.read_marketing_step_history(p_org uuid,p_campaign uuid,p_enrollment uuid DEFAULT NULL,p_status text DEFAULT 'all',p_search text DEFAULT '',p_delivery text DEFAULT 'all',p_after jsonb DEFAULT NULL,p_limit integer DEFAULT 25,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE organization_id=p_org AND id=p_campaign AND channel='email') THEN
  IF p_after IS NOT NULL AND (jsonb_typeof(p_after)<>'object' OR NOT(p_after ?& ARRAY['enrollmentId','order','stepId'])) THEN RAISE EXCEPTION 'Invalid cursor'; END IF;
  RETURN public.read_marketing_email_step_history(p_org,p_campaign,p_enrollment,p_status,p_search,p_delivery,(p_after->>'enrollmentId')::uuid,(p_after->>'order')::integer,(p_after->>'stepId')::uuid,p_limit,p_export);
 END IF;
 RETURN public.read_marketing_step_history_before_email(p_org,p_campaign,p_enrollment,p_status,p_search,p_delivery,p_after,p_limit,p_export);
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('read_marketing_preflight','read_marketing_campaign_metrics','read_marketing_history','read_marketing_step_history','read_marketing_preflight_before_email','read_marketing_campaign_metrics_before_email','read_marketing_history_before_email','read_marketing_step_history_before_email') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  IF f.proname NOT LIKE '%before_email' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.read_marketing_campaign_page(p_org uuid,p_search text DEFAULT '',p_status text DEFAULT 'all',
 p_channel uuid DEFAULT NULL,p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR p_status IS NULL OR p_status NOT IN ('all','draft','active','paused','completed','archived')
 OR (p_before IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'Invalid campaign page'; END IF;
 WITH candidates AS MATERIALIZED (
  SELECT c.id,c.name,c.status,c.created_at,c.scheduled_for,c.connection_id,c.channel,c.smtp_config_id,
   concat_ws(' · ',ic.connection_name,ic.metadata->>'display_phone_number') channel_name
  FROM public.marketing_campaigns c LEFT JOIN public.integration_connections ic ON ic.id=c.connection_id AND ic.organization_id=p_org
  LEFT JOIN public.organization_smtp_configs smtp ON smtp.id=c.smtp_config_id AND smtp.organization_id=p_org
  WHERE c.organization_id=p_org AND (p_search='' OR strpos(lower(c.name),lower(p_search))>0)
  AND (p_status='all' OR c.status=p_status) AND (p_channel IS NULL OR c.connection_id=p_channel OR c.smtp_config_id=p_channel)
  AND (p_before IS NULL OR (c.created_at,c.id)<(p_before,p_before_id))
  AND public.marketing_actor_channel(p_org,auth.uid(),c.connection_id)
  ORDER BY c.created_at DESC,c.id DESC LIMIT 21
 ), page AS MATERIALIZED (SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT 20),
 enrolled AS MATERIALIZED (SELECT e.id,e.campaign_id,e.organization_id,e.status FROM public.marketing_enrollments e JOIN page p ON p.id=e.campaign_id WHERE e.organization_id=p_org),
 recipients AS (SELECT campaign_id,count(*) total,count(*) FILTER(WHERE status='completed') completed,
  count(*) FILTER(WHERE status='failed') failed,count(*) FILTER(WHERE status='cancelled') cancelled FROM enrolled GROUP BY campaign_id),
 deliveries AS (SELECT e.campaign_id,o.status,public.marketing_history_receipt(m.status,ms.status) receipt
  FROM enrolled e JOIN page p ON p.id=e.campaign_id
  JOIN public.meta_outbound_outbox o ON o.organization_id=p_org AND o.connection_id=p.connection_id
   AND split_part(o.operation_key,':',2)=e.id::text AND o.operation_key LIKE 'campaign:%'
  LEFT JOIN public.messages m ON m.organization_id=p_org AND m.id=o.message_id
  LEFT JOIN public.meta_message_statuses ms ON ms.organization_id=p_org AND ms.connection_id=o.connection_id AND ms.external_id=o.external_id
  UNION ALL SELECT o.campaign_id,o.status,NULL::text FROM public.marketing_email_outbox o JOIN page p ON p.id=o.campaign_id WHERE o.organization_id=p_org),
 messages AS (SELECT campaign_id,count(*) FILTER(WHERE status='accepted') accepted,
  count(*) FILTER(WHERE status='accepted' AND receipt IN ('delivered','read')) delivered,
  count(*) FILTER(WHERE status='accepted' AND receipt='read') read,
  count(*) FILTER(WHERE status='failed' OR receipt='failed') failed,count(*) FILTER(WHERE status='unknown') unknown
  FROM deliveries GROUP BY campaign_id)
 SELECT jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'status',p.status,
  'createdAt',p.created_at,'scheduledFor',p.scheduled_for,'channel',coalesce(p.connection_id,p.smtp_config_id),'channelType',p.channel,'channelName',nullif(p.channel_name,''),
  'recipients',coalesce(r.total,0),'completed',coalesce(r.completed,0),'failed',coalesce(r.failed,0),'cancelled',coalesce(r.cancelled,0),
  'accepted',coalesce(m.accepted,0),'delivered',coalesce(m.delivered,0),'read',coalesce(m.read,0),
  'deliveryFailed',coalesce(m.failed,0),'unknown',coalesce(m.unknown,0)) ORDER BY p.created_at DESC,p.id DESC),'[]'::jsonb),
  'next',CASE WHEN (SELECT count(*) FROM candidates)>20 THEN
   (SELECT jsonb_build_object('createdAt',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1) ELSE NULL END)
 INTO result FROM page p LEFT JOIN recipients r ON r.campaign_id=p.id LEFT JOIN messages m ON m.campaign_id=p.id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_campaign_page(uuid,text,text,uuid,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_campaign_page(uuid,text,text,uuid,timestamptz,uuid) TO authenticated;


COMMIT;
