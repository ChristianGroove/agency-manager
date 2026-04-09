-- Add 'sent' field to invoices table to track if invoice was sent to client
alter table public.invoices add column if not exists sent boolean default false;

-- Add 'invoice_id' field to subscriptions to link to auto-generated invoice
alter table public.subscriptions add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
