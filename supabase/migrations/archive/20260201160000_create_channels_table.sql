
create type channel_type as enum ('whatsapp_cloud', 'whatsapp_on_premise', 'email', 'sms');
create type channel_status as enum ('connected', 'disconnected', 'pending', 'error');

create table if not exists public.channels (
    id uuid not null default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    provider text not null check (provider in ('meta_cloud', 'evolution_api', 'resend', 'twilio')),
    provider_channel_id text not null,
    name text,
    identifier text not null, -- Phone number or email
    status text not null default 'connected',
    config jsonb default '{}'::jsonb,
    is_default boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    constraint channels_pkey primary key (id),
    constraint channels_provider_id_unique unique (organization_id, provider, provider_channel_id)
);

-- RLS
alter table public.channels enable row level security;

create policy "Admins can manage channels"
    on public.channels
    for all
    using (
        exists (
            select 1 from organization_members
            where organization_id = channels.organization_id
            and user_id = auth.uid()
            and role in ('owner', 'admin')
        )
    );
