-- 0. DEFENSIVE CLEANUP: Drop all known previous trigger names to avoid double/triple counting
-- These names have been found across different generations of migrations
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conv_on_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
DROP TRIGGER IF EXISTS on_message_upsert_sync_conversation ON public.messages;

-- 1. CLEANUP: Delete duplicate messages keeping the oldest one for each external_id
-- We only do this if external_id is NOT NULL
DELETE FROM public.messages
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY external_id ORDER BY created_at ASC) as rnum
        FROM public.messages
        WHERE external_id IS NOT NULL
    ) t
    WHERE t.rnum > 1
);

-- 2. CONSTRAINT: Add UNIQUE constraint to external_id
-- This prevents future race conditions/retries from inserting the same message twice
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_external_id_unique;

ALTER TABLE public.messages
ADD CONSTRAINT messages_external_id_unique UNIQUE (external_id);


-- 3. TRIGGER: Re-create the SINGLE source of truth trigger
-- We use the function created in 20260318000001
CREATE TRIGGER on_message_upsert_sync_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 4. INDEX: Ensure external_id is indexed for fast lookups (though UNIQUE adds an index automatically)
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);


-- 4. LOG: Record migration success
COMMENT ON CONSTRAINT messages_external_id_unique ON public.messages IS 'Prevents duplicate message insertion from external providers like Meta';
