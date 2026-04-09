-- 1. Create LEADS table
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  name text not null,
  company_name text,
  email text,
  phone text,
  status text default 'open' check (status in ('open', 'converted', 'lost')),
  notes text
);

-- 2. Enable RLS on leads
alter table public.leads enable row level security;

-- 3. Create RLS policy for leads (Admin access)
create policy "Admin can do everything on leads" on public.leads
  for all using (auth.uid() = user_id);

-- 4. Modify QUOTES table to support polymorphic relation
-- Make client_id nullable
alter table public.quotes alter column client_id drop not null;

-- Add lead_id column
alter table public.quotes add column if not exists lead_id uuid references public.leads(id);

-- Add constraint to ensure a quote belongs to EITHER a client OR a lead, but not both (and not neither)
-- Note: We use 'check' constraint. We need to drop it first if it exists to avoid errors on re-runs, 
-- but standard SQL doesn't have 'drop constraint if exists' easily in all versions. 
-- We'll just add it. If it fails, it might be because it exists.
do $$ 
begin 
  if not exists (select 1 from pg_constraint where conname = 'quotes_entity_check') then
    alter table public.quotes add constraint quotes_entity_check check (
      (client_id is not null and lead_id is null) or
      (client_id is null and lead_id is not null)
    );
  end if;
end $$;

-- 5. Update RLS policy for quotes to include leads
-- We need to update the existing policy or create a new one. 
-- The existing policy likely checks client_id. We need to check lead_id too.
-- Let's drop the old policy and create a comprehensive one.

drop policy if exists "Admin can do everything on quotes" on public.quotes;

create policy "Admin can do everything on quotes" on public.quotes
  for all using (
    (client_id is not null and exists (select 1 from public.clients where id = quotes.client_id and user_id = auth.uid()))
    or
    (lead_id is not null and exists (select 1 from public.leads where id = quotes.lead_id and user_id = auth.uid()))
  );
