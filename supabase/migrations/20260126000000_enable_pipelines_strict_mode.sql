-- Process Engine Phase 8: Strict Mode & Pipelines
-- Introduces the 'pipelines' table to support multiple pipelines per org and the 'process_enabled' flag.

-- 1. Create Pipelines Table
create table if not exists pipelines (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade not null,
    name text not null,
    description text,
    is_default boolean default false,
    process_enabled boolean default true, -- Strict Mode ON by default as requested
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS
alter table pipelines enable row level security;

create policy "Users can view pipelines in their org"
    on pipelines for select
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));

create policy "Admins can manage pipelines"
    on pipelines for all
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid() and role in ('owner', 'admin')
    ));

-- 2. Link Stages to Pipelines
alter table pipeline_stages add column if not exists pipeline_id uuid references pipelines(id) on delete cascade;

-- 3. Migration Logic (Backfill)
-- For every organization that has stages but no pipeline, create a default "Ventas" pipeline and link stages.
do $$
declare
    org_rec record;
    new_pipeline_id uuid;
begin
    for org_rec in select distinct organization_id from pipeline_stages where pipeline_id is null loop
        -- Create default pipeline for this org
        insert into pipelines (organization_id, name, is_default, process_enabled)
        values (org_rec.organization_id, 'Ventas', true, true)
        returning id into new_pipeline_id;

        -- Update orphaned stages
        update pipeline_stages
        set pipeline_id = new_pipeline_id
        where organization_id = org_rec.organization_id and pipeline_id is null;
        
        raise notice 'Created default pipeline % for org %', new_pipeline_id, org_rec.organization_id;
    end loop;
end $$;

-- 4. Constraint (Optional but good)
-- alter table pipeline_stages alter column pipeline_id set not null; 
-- (Leaving nullable for safety during migration, but ideally should be enforced)
