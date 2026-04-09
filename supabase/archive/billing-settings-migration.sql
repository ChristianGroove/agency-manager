-- Add Billing Settings
alter table public.organization_settings add column if not exists invoice_prefix text default 'INV-';
alter table public.organization_settings add column if not exists invoice_legal_text text;
alter table public.organization_settings add column if not exists default_due_days integer default 30;
alter table public.organization_settings add column if not exists default_tax_rate numeric default 0;
alter table public.organization_settings add column if not exists default_tax_name text default 'IVA';

-- Add Payment Controls
alter table public.organization_settings add column if not exists enable_portal_payments boolean default true;
alter table public.organization_settings add column if not exists enable_multi_invoice_payment boolean default true;
alter table public.organization_settings add column if not exists min_payment_amount numeric default 0;
alter table public.organization_settings add column if not exists payment_pre_message text;
alter table public.organization_settings add column if not exists payment_success_message text;

-- Add Wompi Info (Read-only/Status)
alter table public.organization_settings add column if not exists wompi_environment text default 'sandbox';
alter table public.organization_settings add column if not exists wompi_last_sync timestamp with time zone;
