-- Presentation reads and draft audience editing only. No send/claim/consent changes.
BEGIN;
CREATE INDEX marketing_campaign_page ON public.marketing_campaigns(organization_id,created_at DESC,id DESC);
CREATE INDEX marketing_audience_page ON public.marketing_audiences(organization_id,created_at DESC,id DESC)
 WHERE coalesce(description,'') NOT LIKE 'campaign:%';

CREATE FUNCTION public.read_marketing_campaign_page(p_org uuid,p_search text DEFAULT '',p_status text DEFAULT 'all',
 p_channel uuid DEFAULT NULL,p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR p_status IS NULL OR p_status NOT IN ('all','draft','active','paused','completed','archived')
 OR (p_before IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'Invalid campaign page'; END IF;
 WITH candidates AS MATERIALIZED (
  SELECT c.id,c.name,c.status,c.created_at,c.scheduled_for,c.connection_id,
   concat_ws(' · ',ic.connection_name,ic.metadata->>'display_phone_number') channel_name
  FROM public.marketing_campaigns c LEFT JOIN public.integration_connections ic ON ic.id=c.connection_id AND ic.organization_id=p_org
  WHERE c.organization_id=p_org AND (p_search='' OR strpos(lower(c.name),lower(p_search))>0)
  AND (p_status='all' OR c.status=p_status) AND (p_channel IS NULL OR c.connection_id=p_channel)
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
  LEFT JOIN public.meta_message_statuses ms ON ms.organization_id=p_org AND ms.connection_id=o.connection_id AND ms.external_id=o.external_id),
 messages AS (SELECT campaign_id,count(*) FILTER(WHERE status='accepted') accepted,
  count(*) FILTER(WHERE status='accepted' AND receipt IN ('delivered','read')) delivered,
  count(*) FILTER(WHERE status='accepted' AND receipt='read') read,
  count(*) FILTER(WHERE status='failed' OR receipt='failed') failed,count(*) FILTER(WHERE status='unknown') unknown
  FROM deliveries GROUP BY campaign_id)
 SELECT jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'status',p.status,
  'createdAt',p.created_at,'scheduledFor',p.scheduled_for,'channel',p.connection_id,'channelName',nullif(p.channel_name,''),
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

CREATE FUNCTION public.read_marketing_audience_page(p_org uuid,p_search text DEFAULT '',p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF p_search IS NULL OR length(p_search)>100 OR (p_before IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'Invalid audience page'; END IF;
 RETURN (WITH candidates AS MATERIALIZED (SELECT a.id,a.name,a.created_at,a.filter_config FROM public.marketing_audiences a
  WHERE a.organization_id=p_org AND (p_search='' OR strpos(lower(a.name),lower(p_search))>0)
  AND (p_before IS NULL OR (a.created_at,a.id)<(p_before,p_before_id))
  AND coalesce(a.description,'') NOT LIKE 'campaign:%' ORDER BY a.created_at DESC,a.id DESC LIMIT 21),
  page AS (SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT 20)
  SELECT jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'createdAt',created_at,'filters',filter_config) ORDER BY created_at DESC,id DESC),'[]'::jsonb),
  'next',CASE WHEN (SELECT count(*) FROM candidates)>20 THEN (SELECT jsonb_build_object('createdAt',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1) ELSE NULL END) FROM page);
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_audience_page(uuid,text,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_audience_page(uuid,text,timestamptz,uuid) TO authenticated;

CREATE FUNCTION public.read_marketing_campaign_audience(p_org uuid,p_campaign uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.marketing_history_access(p_org,p_campaign,false);
 RETURN (SELECT jsonb_build_object('id',a.id,'name',a.name,'filters',a.filter_config) FROM public.marketing_campaigns c
  JOIN public.marketing_audiences a ON a.id=c.audience_id AND a.organization_id=p_org WHERE c.id=p_campaign AND c.organization_id=p_org);
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_campaign_audience(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_campaign_audience(uuid,uuid) TO authenticated;

CREATE FUNCTION public.save_marketing_campaign_audience(p_org uuid,p_campaign uuid,p_filters jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE campaign public.marketing_campaigns; selected_audience uuid; summary jsonb;
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'manage') THEN RAISE EXCEPTION 'Marketing edit access denied'; END IF;
 SELECT * INTO campaign FROM public.marketing_campaigns WHERE organization_id=p_org AND id=p_campaign FOR UPDATE;
 IF NOT FOUND OR campaign.status<>'draft' THEN RAISE EXCEPTION 'Campaign must be a draft'; END IF;
 IF NOT public.marketing_actor_channel(p_org,auth.uid(),campaign.connection_id) THEN RAISE EXCEPTION 'Channel access denied'; END IF;
 IF jsonb_typeof(p_filters) IS DISTINCT FROM 'object' OR pg_column_size(p_filters)>16384 THEN RAISE EXCEPTION 'Invalid audience'; END IF;
 summary:=public.marketing_audience_summary(p_org,p_filters);
 -- Never rewrite a reusable/legacy segment or an audience used by another campaign.
 SELECT a.id INTO selected_audience FROM public.marketing_audiences a WHERE a.id=campaign.audience_id AND a.organization_id=p_org
 AND a.description='campaign:'||p_campaign::text AND NOT EXISTS(SELECT 1 FROM public.marketing_campaigns c
  WHERE c.organization_id=p_org AND c.id<>p_campaign AND c.audience_id=a.id) FOR UPDATE;
 IF selected_audience IS NULL THEN
  INSERT INTO public.marketing_audiences(organization_id,name,description,type,filter_config,cached_count)
  VALUES(p_org,left(campaign.name,140)||' · destinatarios','campaign:'||p_campaign::text,'dynamic',p_filters,(summary->>'eligible')::integer) RETURNING id INTO selected_audience;
 ELSE
  UPDATE public.marketing_audiences SET filter_config=p_filters,cached_count=(summary->>'eligible')::integer WHERE id=selected_audience AND organization_id=p_org;
 END IF;
 UPDATE public.marketing_campaigns SET audience_id=selected_audience WHERE id=p_campaign AND organization_id=p_org;
 RETURN selected_audience;
END $$;
REVOKE ALL ON FUNCTION public.save_marketing_campaign_audience(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_marketing_campaign_audience(uuid,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
