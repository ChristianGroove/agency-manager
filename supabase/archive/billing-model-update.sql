-- Create billing_cycles table
create table if not exists public.billing_cycles (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    service_id uuid references public.services(id) on delete cascade not null,
    invoice_id uuid references public.invoices(id) on delete set null, -- Nullable if cycle is pending
    
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    due_date timestamp with time zone,
    
    amount numeric not null default 0,
    status text not null check (status in ('pending', 'invoiced', 'paid', 'cancelled', 'failed')),
    
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.billing_cycles enable row level security;

-- Create Policies
create policy "Enable all for authenticated users" on public.billing_cycles
    for all using (auth.role() = 'authenticated');

-- Indexes
create index if not exists billing_cycles_service_id_idx on public.billing_cycles(service_id);
create index if not exists billing_cycles_invoice_id_idx on public.billing_cycles(invoice_id);
create index if not exists billing_cycles_status_idx on public.billing_cycles(status);

-- Add new columns to services table
alter table public.services 
add column if not exists service_start_date timestamp with time zone,
add column if not exists billing_cycle_start_date timestamp with time zone;

-- Backfill services columns
update public.services 
set 
    service_start_date = created_at,
    billing_cycle_start_date = created_at
where service_start_date is null;

-- Backfill Migration for Billing Cycles from Invoices
do $$
declare
    inv record;
    svc record;
    cycle_start timestamp with time zone;
    cycle_end timestamp with time zone;
    cycle_status text;
begin
    for inv in select * from public.invoices where service_id is not null loop
        
        -- Get service details
        select * from public.services where id = inv.service_id into svc;
        
        -- Determine dates
        -- For historical invoices, we assume the invoice date was roughly the start or end. 
        -- To be safe and consistent with "invoice at end of period", we might assume the invoice date is the END.
        -- BUT, for simplicity in backfill, let's treat the invoice date as the significant anchor.
        cycle_start := inv.date;
        
        -- Estimate end date based on service frequency
        if svc.frequency = 'biweekly' then
            cycle_end := cycle_start + interval '14 days';
        elsif svc.frequency = 'quarterly' then
            cycle_end := cycle_start + interval '3 months';
        elsif svc.frequency = 'semiannual' then
            cycle_end := cycle_start + interval '6 months';
        elsif svc.frequency = 'yearly' then
            cycle_end := cycle_start + interval '1 year';
        else
            -- Monthly or One-Off
            cycle_end := cycle_start + interval '1 month';
        end if;
        
        -- Determine status
        if inv.status = 'paid' then
            cycle_status := 'paid';
        elsif inv.status = 'cancelled' then
            cycle_status := 'cancelled';
        else
            cycle_status := 'invoiced';
        end if;

        -- Check if cycle already exists to avoid duplicates
        if not exists (select 1 from public.billing_cycles where invoice_id = inv.id) then
            insert into public.billing_cycles (
                service_id,
                invoice_id,
                start_date,
                end_date,
                due_date,
                amount,
                status
            ) values (
                inv.service_id,
                inv.id,
                cycle_start,
                cycle_end,
                inv.due_date,
                inv.total,
                cycle_status
            );
        end if;
        
    end loop;
end $$;
