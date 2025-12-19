-- Create SERVICES table
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  start_date date,
  end_date date
);

-- RLS for services
alter table public.services enable row level security;

create policy "Admin can do everything on services" on public.services
  for all using (exists (select 1 from public.clients where id = services.client_id and user_id = auth.uid()));

-- Add service_id to related tables
alter table public.invoices 
add column if not exists service_id uuid references public.services(id) on delete set null;

alter table public.briefings 
add column if not exists service_id uuid references public.services(id) on delete set null;

alter table public.quotes 
add column if not exists service_id uuid references public.services(id) on delete set null;

-- Add indexes for performance
create index if not exists invoices_service_id_idx on public.invoices(service_id);
create index if not exists briefings_service_id_idx on public.briefings(service_id);
create index if not exists quotes_service_id_idx on public.quotes(service_id);
create index if not exists services_client_id_idx on public.services(client_id);
