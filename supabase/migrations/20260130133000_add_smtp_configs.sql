-- Enable pgcrypto if we decided to do DB-side (optional, but good to have)
-- create extension if not exists "pgcrypto";

create type public.smtp_provider_type as enum ('gmail', 'outlook', 'office365', 'zoho', 'custom');

create table if not exists public.organization_smtp_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  
  -- Provider Preset (helps UI show correct icon/help)
  provider public.smtp_provider_type default 'custom',
  
  -- Connection Details
  host text not null,
  port integer not null,
  user_email text not null, -- The username/email used to login
  
  -- Security
  -- We store the password ENCRYPTED by the application layer (Node.js crypto)
  -- NOT raw text.
  password_encrypted text not null,
  iv text not null, -- Initialization Vector for AES encryption
  
  -- Sender Identity
  from_email text not null, -- Might be different from user_email (aliases)
  from_name text not null,
  
  -- Status
  is_verified boolean default false, -- True only after successful connection test
  last_verified_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraint: One config per organization
  constraint organization_smtp_configs_org_unique unique (organization_id)
);

-- RLS
alter table public.organization_smtp_configs enable row level security;

-- Only organization admins (members) can see/manage their config
create policy "Users can view their org smtp config"
  on public.organization_smtp_configs for select
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "Users can manage their org smtp config"
  on public.organization_smtp_configs for all
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );
