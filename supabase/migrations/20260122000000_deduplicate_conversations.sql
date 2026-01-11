-- DATA CLEANUP: Merge Duplicate Conversations --

DO $$
DECLARE
    r RECORD;
    keeper_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Find groups of duplicate active conversations
    FOR r IN
        SELECT lead_id, channel, array_agg(id ORDER BY updated_at DESC) as ids, count(*) as cnt
        FROM conversations
        WHERE state = 'active'
        GROUP BY lead_id, channel
        HAVING count(*) > 1
    LOOP
        -- The first ID is the most recently updated (Keeper)
        keeper_id := r.ids[1];
        duplicate_ids := r.ids[2:array_length(r.ids, 1)];

        -- 1. Move messages from duplicates to keeper
        UPDATE messages
        SET conversation_id = keeper_id
        WHERE conversation_id = ANY(duplicate_ids);

        -- 2. Archive the duplicates (don't delete to be safe, just close them)
        UPDATE conversations
        SET state = 'archived', status = 'closed', notes = 'Auto-archived as duplicate'
        WHERE id = ANY(duplicate_ids);

        RAISE NOTICE 'Merged duplicates for Lead % Channel %: Keeper %, Duplicates %', r.lead_id, r.channel, keeper_id, duplicate_ids;
    END LOOP;
END $$;

-- ADD CONSTRAINT: Prevent future duplicates
-- valid only for active conversations
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_conversation_idx 
ON conversations (lead_id, channel) 
WHERE state = 'active';

-- Add comment
COMMENT ON INDEX unique_active_conversation_idx IS 'Ensures only one active conversation exists per lead per channel';
