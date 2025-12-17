-- 1. Create Subscriptions Table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  service_type text not null check (service_type in ('marketing', 'ads', 'crm', 'hosting', 'other')),
  name text not null, -- e.g., "Plan Marketing Pro", "Licencia CRM"
  amount numeric not null,
  frequency text not null check (frequency in ('monthly', 'yearly')),
  start_date date not null,
  next_billing_date date not null,
  status text default 'active' check (status in ('active', 'paused', 'cancelled'))
);

-- Enable RLS
alter table public.subscriptions enable row level security;
create policy "Admin can do everything on subscriptions" on public.subscriptions for all using (exists (select 1 from public.clients where id = subscriptions.client_id and user_id = auth.uid()));

-- 2. Updated Seed Data (Run this to populate subscriptions)
-- Nota: Asegúrate de reemplazar 'TU_ID_DE_USUARIO_AQUI' con tu ID real si vas a borrar y recrear todo.
-- Si solo vas a insertar suscripciones a clientes existentes, usa los IDs que ya tienen (o límpialos primero).

-- Para este ejemplo, asumiremos que los clientes ya existen (del paso anterior).
-- Vamos a insertar suscripciones para los clientes 'a0eebc99...' etc.

INSERT INTO public.subscriptions (client_id, service_type, name, amount, frequency, start_date, next_billing_date, status) VALUES
-- Cliente 1: Tech Solutions (Tiene Marketing y CRM)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'marketing', 'Marketing Mensual - Plan Gold', 1500000, 'monthly', '2024-01-01', '2025-01-01', 'active'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'crm', 'Licencia CRM', 200000, 'monthly', '2024-01-01', '2025-01-05', 'active'), -- Vence pronto

-- Cliente 2: Moda & Estilo (Tiene Ads y Hosting en la otra tabla, aquí solo Ads)
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ads', 'Gestión de Pauta FB/IG', 800000, 'monthly', '2024-06-15', '2024-12-15', 'active'), -- Venció hoy/ayer

-- Cliente 3: Constructora JM (Tiene todo)
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'marketing', 'Marketing Inmobiliario', 2500000, 'monthly', '2024-03-01', '2025-01-01', 'active'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'crm', 'CRM Inmobiliario', 500000, 'monthly', '2024-03-01', '2025-01-01', 'active');
