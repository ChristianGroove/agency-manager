-- Add snoozed_until column
ALTER TABLE "public"."conversations"
ADD COLUMN IF NOT EXISTS "snoozed_until" timestamp with time zone;

-- Function to unsnooze conversation on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_unsnooze()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for inbound messages or if we want outbound to also reopen it (usually yes)
    -- Let's say ANY new message reopens the conversation
    UPDATE public.conversations
    SET 
        status = 'open',
        snoozed_until = NULL,
        updated_at = NOW()
    WHERE id = NEW.conversation_id
    AND status = 'snoozed';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_new_message_unsnooze ON public.messages;
CREATE TRIGGER on_new_message_unsnooze
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message_unsnooze();
