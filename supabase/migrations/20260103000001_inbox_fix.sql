-- DROP existing tables safely with CASCADE to remove dependent triggers/keys
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop function if exists public.update_conversation_last_message() cascade;

-- Re-Create Tables
create table public.conversations (
    id uuid not null default gen_random_uuid(),
    organization_id uuid not null, -- Removed default auth.uid() to enforce explicit org
    lead_id uuid references public.leads(id) on delete set null,
    channel text not null check (channel in ('whatsapp', 'email', 'sms')),
    status text not null default 'open' check (status in ('open', 'closed', 'snoozed')),
    assigned_to uuid references auth.users(id) on delete set null,
    last_message text,
    last_message_at timestamptz default now(),
    unread_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    constraint conversations_pkey primary key (id)
);

create table public.messages (
    id uuid not null default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    direction text not null check (direction in ('inbound', 'outbound')),
    channel text not null check (channel in ('whatsapp', 'email', 'sms')),
    content jsonb not null default '{}'::jsonb,
    status text not null default 'sent' check (status in ('sent', 'delivered', 'read', 'failed')),
    external_id text,
    sender text, -- Phone number or Agent Name
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    
    constraint messages_pkey primary key (id)
);

-- Indexes for Speed
create index idx_conversations_org on public.conversations(organization_id);
create index idx_conversations_status on public.conversations(status);
create index idx_conversations_updated on public.conversations(last_message_at desc);

create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_created on public.messages(created_at);

-- RLS Policies
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policy: Admin/Service Role Bypass (implicitly handled, but explicit policy helps if using user client)
-- Authenticated users policies
create policy "Users can view conversations"
    on public.conversations for select
    using ( auth.role() = 'authenticated' );

create policy "Users can update conversations"
    on public.conversations for update
    using ( auth.role() = 'authenticated' );

create policy "Users can insert conversations"
    on public.conversations for insert
    with check ( auth.role() = 'authenticated' );

create policy "Users can view messages"
    on public.messages for select
    using ( auth.role() = 'authenticated' );

create policy "Users can insert messages"
    on public.messages for insert
    with check ( auth.role() = 'authenticated' );

-- Function to update conversation last_message logic
create or replace function public.update_conversation_last_message()
returns trigger as $$
begin
    update public.conversations
    set 
        last_message = jsonb_extract_path_text(new.content, 'text'), 
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

-- Trigger
create trigger on_new_message
    after insert on public.messages
    for each row execute function public.update_conversation_last_message();

-- Enable Realtime
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
