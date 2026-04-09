-- Function to update conversation last_message logic with multimedia support
create or replace function public.update_conversation_last_message()
returns trigger as $$
declare
    msg_text text;
    msg_type text;
begin
    -- Extract text or generate preview based on type
    msg_type := jsonb_extract_path_text(new.content, 'type');
    msg_text := jsonb_extract_path_text(new.content, 'text');

    if msg_text is null or msg_text = '' then
        if msg_type = 'image' then
            msg_text := '📷 Image';
        elsif msg_type = 'video' then
            msg_text := '🎥 Video';
        elsif msg_type = 'audio' then
            msg_text := '🎤 Audio';
        elsif msg_type = 'document' then
            msg_text := '📄 Document';
        else
            msg_text := 'New message';
        end if;
    end if;

    update public.conversations
    set 
        last_message = msg_text,
        last_message_at = new.created_at,
        updated_at = now(),
        unread_count = case 
            when new.direction = 'inbound' then unread_count + 1 
            else unread_count 
        end
    where id = new.conversation_id;
    return new;
end;
$$ language plpgsql security definer;
