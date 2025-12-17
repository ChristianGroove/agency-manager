-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CLIENTS TABLE
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null, -- Link to the admin user
  name text not null,
  company_name text,
  nit text,
  email text,
  phone text,
  address text,
  logo_url text
);

-- HOSTING ACCOUNTS TABLE
create table public.hosting_accounts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  domain text not null,
  provider text,
  start_date date,
  renewal_date date not null,
  cost numeric,
  status text default 'active' check (status in ('active', 'expired', 'cancelled'))
);

-- INVOICES TABLE
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  number text not null,
  date date not null,
  due_date date,
  items jsonb not null default '[]'::jsonb, -- Array of { description, quantity, price }
  total numeric not null,
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  pdf_url text
);

-- QUOTES TABLE
create table public.quotes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  number text not null,
  date date not null,
  items jsonb not null default '[]'::jsonb,
  total numeric not null,
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  pdf_url text
);

-- RLS POLICIES (Simple for single admin)
alter table public.clients enable row level security;
alter table public.hosting_accounts enable row level security;
alter table public.invoices enable row level security;
alter table public.quotes enable row level security;

create policy "Admin can do everything on clients" on public.clients
  for all using (auth.uid() = user_id);

create policy "Admin can do everything on hosting" on public.hosting_accounts
  for all using (exists (select 1 from public.clients where id = hosting_accounts.client_id and user_id = auth.uid()));

create policy "Admin can do everything on invoices" on public.invoices
  for all using (exists (select 1 from public.clients where id = invoices.client_id and user_id = auth.uid()));

create policy "Admin can do everything on quotes" on public.quotes
  for all using (exists (select 1 from public.clients where id = quotes.client_id and user_id = auth.uid()));
