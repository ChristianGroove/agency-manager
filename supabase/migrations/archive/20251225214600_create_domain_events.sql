
create type event_trigger_type as enum ('system', 'user', 'webhook');

create table domain_events (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  triggered_by event_trigger_type not null default 'system',
  actor_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_domain_events_entity on domain_events(entity_type, entity_id);
create index idx_domain_events_created_at on domain_events(created_at);
