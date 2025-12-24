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

-- Create Policies (Same as other tables: authenticated view, admin edit - simplified for this user to 'all for auth')
create policy "Enable all for authenticated users" on public.billing_cycles
    for all using (auth.role() = 'authenticated');

-- Indexes
create index if not exists billing_cycles_service_id_idx on public.billing_cycles(service_id);
create index if not exists billing_cycles_invoice_id_idx on public.billing_cycles(invoice_id);
create index if not exists billing_cycles_status_idx on public.billing_cycles(status);

-- Backfill Migration
-- For every existing invoice that has a service_id, create a corresponding billing_cycle
do $$
declare
    inv record;
    svc record;
    cycle_start timestamp with time zone;
    cycle_end timestamp with time zone;
    cycle_status text;
begin
    for inv in select * from public.invoices where service_id is not null loop
        
        -- Get service details mainly for frequency if needed, though we might just infer 1 month default for historic
        select * from public.services where id = inv.service_id into svc;
        
        -- Determine dates
        cycle_start := inv.date;
        
        -- Estimate end date based on service frequency or default to +1 month
        if svc.frequency = 'biweekly' then
            cycle_end := cycle_start + interval '14 days';
        elsif svc.frequency = 'quarterly' then
            cycle_end := cycle_start + interval '3 months';
        elsif svc.frequency = 'semiannual' then
            cycle_end := cycle_start + interval '6 months';
        elsif svc.frequency = 'yearly' then
            cycle_end := cycle_start + interval '1 year';
        else
            -- Monthly or One-Off (treat one-off as single date or 1 month duration for record)
            cycle_end := cycle_start + interval '1 month';
        end if;
        
        -- Determine status
        if inv.status = 'paid' then
            cycle_status := 'paid';
        elsif inv.status = 'cancelled' then
            cycle_status := 'cancelled';
        else
            cycle_status := 'invoiced'; -- pending/overdue invoices are still 'invoiced' cycles
        end if;

        -- Insert Billing Cycle
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
        
    end loop;
end $$;
