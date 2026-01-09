-- ============================================
-- FASE 32: DYNAMIC DEAL ENGINE
-- Date: 2026-01-09
-- Description: Cart system for building quotes + Auto-Sync Triggers
-- ============================================

-- 1. Create Deal Carts Table
create table if not exists public.deal_carts (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    
    status text not null default 'draft' check (status in ('draft', 'locked', 'converted')),
    currency text default 'USD',
    
    total_amount numeric default 0,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    -- Ensure one active cart per lead? Or just one cart? 
    -- For now, one unique cart per lead to be "The" quote.
    constraint uq_deal_carts_lead unique(lead_id)
);

-- Index for performance
create index if not exists idx_deal_carts_lead on public.deal_carts(lead_id);
create index if not exists idx_deal_carts_org on public.deal_carts(organization_id);

-- 2. Create Cart Items Table
create table if not exists public.cart_items (
    id uuid primary key default gen_random_uuid(),
    cart_id uuid not null references public.deal_carts(id) on delete cascade,
    
    product_id uuid references public.service_catalog(id) on delete set null,
    
    -- Snapshots (in case catalog changes)
    name text not null,
    unit_price numeric not null default 0,
    
    quantity integer not null default 1,
    
    -- Flexible metadata for variants/modifiers
    metadata jsonb default '{}'::jsonb,
    
    created_at timestamptz default now()
);

create index if not exists idx_cart_items_cart on public.cart_items(cart_id);

-- 3. RLS Policies
alter table public.deal_carts enable row level security;
alter table public.cart_items enable row level security;

-- Deal Carts Policy
create policy "Users can view deal_carts of their organization"
    on public.deal_carts for select
    using (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

create policy "Users can modify deal_carts of their organization"
    on public.deal_carts for all
    using (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

-- Cart Items Policy (Inherits from Cart)
create policy "Users can view cart_items of their organization"
    on public.cart_items for select
    using (
        exists (
            select 1 from public.deal_carts c
            where c.id = cart_items.cart_id
            and c.organization_id in (
                select organization_id from public.organization_members
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can modify cart_items of their organization"
    on public.cart_items for all
    using (
        exists (
            select 1 from public.deal_carts c
            where c.id = cart_items.cart_id
            and c.organization_id in (
                select organization_id from public.organization_members
                where user_id = auth.uid()
            )
        )
    );


-- ============================================
-- 4. LOGIC ENGINE (TRIGGERS)
-- ============================================

-- A. Trigger Function: Recalculate Cart Total
create or replace function public.calculate_cart_total()
returns trigger as $$
begin
    -- Update the parent cart's total_amount
    update public.deal_carts
    set 
        total_amount = (
            select coalesce(sum(quantity * unit_price), 0)
            from public.cart_items
            where cart_id = coalesce(new.cart_id, old.cart_id)
        ),
        updated_at = now()
    where id = coalesce(new.cart_id, old.cart_id);
    
    return null;
end;
$$ language plpgsql security definer;

-- Trigger: On Item Changes
drop trigger if exists on_cart_item_change on public.cart_items;
create trigger on_cart_item_change
after insert or update or delete on public.cart_items
for each row execute function public.calculate_cart_total();


-- B. Trigger Function: Sync Lead Value
-- When the Cart Total changes, update the Lead Value
create or replace function public.sync_lead_value()
returns trigger as $$
begin
    -- Only update if total changed
    if (old.total_amount is distinct from new.total_amount) then
        update public.leads
        set 
            value = new.total_amount,
            updated_at = now()
        where id = new.lead_id;
    end if;
    
    return new;
end;
$$ language plpgsql security definer;

-- Trigger: On Cart total change
drop trigger if exists on_cart_total_sync on public.deal_carts;
create trigger on_cart_total_sync
after update of total_amount on public.deal_carts
for each row execute function public.sync_lead_value();

-- Trigger: On Cart Creation (if created with amount, though usually 0)
drop trigger if exists on_cart_create_sync on public.deal_carts;
create trigger on_cart_create_sync
after insert on public.deal_carts
for each row execute function public.sync_lead_value();
