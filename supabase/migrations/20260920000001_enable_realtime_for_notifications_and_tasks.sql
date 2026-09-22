-- Enable Realtime for notifications and task_items tables
DO $$
BEGIN
    -- Add notifications to supabase_realtime if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    -- Add task_items to supabase_realtime if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'task_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_items;
    END IF;
END $$;

-- Set replica identity to full so that update payloads contain old and new records
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.task_items REPLICA IDENTITY FULL;