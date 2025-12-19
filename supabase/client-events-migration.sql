-- Create client_events table
create table public.client_events (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  type text not null, -- 'invoice_created', 'payment_received', 'quote_sent', 'briefing_assigned', 'project_update'
  title text not null,
  description text,
  metadata jsonb default '{}'::jsonb,
  icon text -- lucide icon name
);

-- Enable RLS
alter table public.client_events enable row level security;

-- Policies
-- Admin can do everything
create policy "Admin can do everything on client_events" on public.client_events
  for all using (exists (select 1 from public.clients where id = client_events.client_id and user_id = auth.uid()));

-- Indexes
create index idx_client_events_client_id on public.client_events(client_id);
create index idx_client_events_created_at on public.client_events(created_at desc);
