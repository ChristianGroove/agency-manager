-- Create organization_settings table
create table if not exists public.organization_settings (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Agency Identity
  agency_name text not null default 'My Agency',
  agency_legal_name text,
  agency_logo_url text,
  agency_email text,
  agency_phone text,
  agency_website text,
  agency_country text default 'Colombia',
  agency_currency text default 'COP',
  agency_timezone text default 'America/Bogota',
  
  -- General Configuration
  default_language text default 'es',
  portal_language text default 'es',
  date_format text default 'DD/MM/YYYY',
  currency_format text default 'es-CO',
  legal_text text
);

-- Ensure only one row exists using a unique index on a constant
create unique index if not exists organization_settings_singleton_idx on public.organization_settings ((true));

-- RLS Policies
alter table public.organization_settings enable row level security;

-- Allow read access to authenticated users (and potentially public if needed for portal, but let's restrict to auth for now)
create policy "Authenticated users can read settings"
  on public.organization_settings for select
  to authenticated
  using (true);

-- Allow update access only to admin (assuming auth.uid() check or similar, for now we'll allow authenticated to keep it simple as per existing policies)
create policy "Authenticated users can update settings"
  on public.organization_settings for update
  to authenticated
  using (true);

-- Allow insert only if table is empty (enforced by singleton index anyway, but good to have policy)
create policy "Authenticated users can insert settings"
  on public.organization_settings for insert
  to authenticated
  with check (true);
