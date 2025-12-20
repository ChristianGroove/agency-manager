-- Add next_billing_date to services table
alter table public.services
add column if not exists next_billing_date timestamp with time zone;

-- Create index for billing queries
create index if not exists services_next_billing_date_idx on public.services(next_billing_date);
