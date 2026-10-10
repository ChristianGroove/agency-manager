BEGIN;

-- Private transaction-local capabilities. RPC creates exact targets and removes them
-- before returning; an exception/crash rolls everything back. No client can write these.
CREATE TABLE public.marketing_step_reorder_guards (
 transaction_id bigint NOT NULL, sequence_id uuid NOT NULL, step_id uuid NOT NULL,
 target_index integer NOT NULL, PRIMARY KEY(transaction_id,step_id)
);
ALTER TABLE public.marketing_step_reorder_guards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_step_reorder_guards FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.marketing_step_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.order_index IS DISTINCT FROM OLD.order_index AND NOT EXISTS(
  SELECT 1 FROM public.marketing_step_reorder_guards g WHERE g.transaction_id=txid_current()
   AND g.sequence_id=NEW.sequence_id AND g.step_id=NEW.id AND g.target_index=NEW.order_index
 ) THEN RAISE EXCEPTION 'Step ordering requires a dedicated reorder operation'; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM 1 FROM public.marketing_campaigns WHERE id=(SELECT campaign_id FROM public.marketing_sequences WHERE id=NEW.sequence_id) FOR UPDATE;
  SELECT coalesce(max(order_index),-1)+1 INTO NEW.order_index FROM public.marketing_steps WHERE sequence_id=NEW.sequence_id;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.reorder_marketing_steps(p_org uuid,p_campaign uuid,p_sequence uuid,p_expected uuid[],p_order uuid[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE campaign public.marketing_campaigns; current_order uuid[];
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'manage') THEN RAISE EXCEPTION 'Marketing edit access denied'; END IF;
 SELECT * INTO campaign FROM public.marketing_campaigns WHERE id=p_campaign AND organization_id=p_org FOR UPDATE;
 IF NOT FOUND OR campaign.status<>'draft' OR campaign.execution_version IS NOT NULL THEN RAISE EXCEPTION 'Campaign must be an unexecuted draft'; END IF;
 IF NOT public.marketing_actor_channel(p_org,auth.uid(),campaign.connection_id) THEN RAISE EXCEPTION 'Channel access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketing_sequences WHERE id=p_sequence AND campaign_id=p_campaign AND organization_id=p_org) THEN RAISE EXCEPTION 'Invalid marketing sequence'; END IF;
 -- A concurrent direct edit may already hold a child row and be waiting for the
 -- campaign. Fail cleanly rather than creating a parent/child lock cycle.
 PERFORM 1 FROM public.marketing_steps WHERE sequence_id=p_sequence AND organization_id=p_org ORDER BY id FOR UPDATE NOWAIT;
 IF p_expected IS NULL OR p_order IS NULL OR cardinality(p_order) NOT BETWEEN 1 AND 500
  OR array_ndims(p_order)<>1 OR array_ndims(p_expected)<>1 THEN RAISE EXCEPTION 'Invalid step order'; END IF;
 SELECT coalesce(array_agg(id ORDER BY order_index,id),'{}'::uuid[]) INTO current_order
  FROM public.marketing_steps WHERE sequence_id=p_sequence AND organization_id=p_org;
 IF cardinality(p_order)<>cardinality(current_order) OR cardinality(p_order)<>(SELECT count(DISTINCT id) FROM unnest(p_order) id)
  OR cardinality(p_expected)<>cardinality(current_order) OR cardinality(p_expected)<>(SELECT count(DISTINCT id) FROM unnest(p_expected) id)
  OR NOT p_order @> current_order OR NOT current_order @> p_order
  OR NOT p_expected @> current_order OR NOT current_order @> p_expected THEN RAISE EXCEPTION 'Invalid step order'; END IF;
 -- Same target is a safe retry after a lost response; a different stale target fails.
 IF current_order=p_order THEN RETURN true; END IF;
 IF p_expected IS DISTINCT FROM current_order THEN RAISE EXCEPTION 'Step order changed; reload the draft'; END IF;
 INSERT INTO public.marketing_step_reorder_guards(transaction_id,sequence_id,step_id,target_index)
  SELECT txid_current(),p_sequence,id,(position-1)::integer FROM unnest(p_order) WITH ORDINALITY AS ordered(id,position);
 UPDATE public.marketing_steps s SET order_index=g.target_index FROM public.marketing_step_reorder_guards g
  WHERE g.transaction_id=txid_current() AND g.sequence_id=p_sequence AND s.id=g.step_id
   AND s.sequence_id=p_sequence AND s.organization_id=p_org AND s.order_index IS DISTINCT FROM g.target_index;
 DELETE FROM public.marketing_step_reorder_guards WHERE transaction_id=txid_current() AND sequence_id=p_sequence;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reorder_marketing_steps(uuid,uuid,uuid,uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reorder_marketing_steps(uuid,uuid,uuid,uuid[],uuid[]) TO authenticated;

CREATE FUNCTION public.read_marketing_assignees(p_org uuid,p_search text DEFAULT '',p_after uuid DEFAULT NULL,p_selected uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.marketing_actor_permission(p_org,auth.uid(),'view') THEN RAISE EXCEPTION 'Marketing access denied'; END IF;
 IF p_search IS NULL OR length(p_search)>100 THEN RAISE EXCEPTION 'Invalid assignee search'; END IF;
 RETURN (WITH candidates AS MATERIALIZED (
  SELECT m.user_id id,coalesce(nullif(trim(p.full_name),''),'Integrante sin nombre') name
  FROM public.organization_members m LEFT JOIN public.profiles p ON p.id=m.user_id
  WHERE m.organization_id=p_org AND m.deleted_at IS NULL AND coalesce(m.status,'active')='active'
   AND (p_after IS NULL OR m.user_id>p_after) AND (p_search='' OR strpos(lower(coalesce(p.full_name,'')),lower(p_search))>0)
  ORDER BY m.user_id LIMIT 21
 ), page AS (SELECT * FROM candidates ORDER BY id LIMIT 20)
 SELECT jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id),'[]'::jsonb),
  'next',CASE WHEN (SELECT count(*) FROM candidates)>20 THEN (SELECT id FROM page ORDER BY id DESC LIMIT 1) ELSE NULL END,
  'selected',(SELECT jsonb_build_object('id',m.user_id,'name',coalesce(nullif(trim(p.full_name),''),'Integrante sin nombre'),
    'active',m.deleted_at IS NULL AND coalesce(m.status,'active')='active')
   FROM public.organization_members m LEFT JOIN public.profiles p ON p.id=m.user_id WHERE m.organization_id=p_org AND m.user_id=p_selected)) FROM page);
END $$;
REVOKE ALL ON FUNCTION public.read_marketing_assignees(uuid,text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_marketing_assignees(uuid,text,uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
