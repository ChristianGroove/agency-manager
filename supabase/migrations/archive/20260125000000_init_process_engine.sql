-- Process Engine Foundation Schema
-- Parallel system to govern state transitions and business process logic independent of the visual pipeline.

-- 1. Process States (The "Law")
-- Defines valid states for different process types (e.g., 'sale', 'onboarding')
create table if not exists process_states (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade not null,
    type text not null, -- e.g., 'sale', 'support_ticket', 'advisory'
    key text not null, -- machine-readable key: 'discovery', 'checkout', 'completed'
    name text not null, -- Human readable: 'Discovery Phase'
    description text,
    allowed_next_states text[], -- Array of state keys that can follow this one ['checkout', 'lost']
    is_terminal boolean default false, -- If true, process ends here
    is_initial boolean default false, -- If true, this is a starting point
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Unique key per org and type
    unique(organization_id, type, key)
);

-- RLS for process_states
alter table process_states enable row level security;

create policy "Users can view process states in their org"
    on process_states for select
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));

create policy "Admins can manage process states"
    on process_states for all
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid() and role in ('owner', 'admin')
    ));


-- 2. Process Instances (The "Active Reality")
-- Tracks the specific journey of a Lead through a Process Type
create table if not exists process_instances (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade not null,
    lead_id uuid references leads(id) on delete cascade not null, -- specific to leads for now
    type text not null, -- Must match a type in process_states
    current_state text not null, -- Matches a 'key' in process_states
    
    status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
    
    locked boolean default false, -- If true, automated changes are blocked until manual intervention
    
    context jsonb default '{}'::jsonb, -- Store process-specific data (e.g. cart_value, intent_score)
    history jsonb[] default array[]::jsonb[], -- Audit log of transitions [{from: 'a', to: 'b', ts: ...}]
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    -- Constraint: Only one active process of a type per lead? 
    -- For V1 let's allow multiple but maybe unique(lead_id, type) where status='active' is better handled in logic
    -- Just index for speed
    unique(lead_id, type) -- Simplified: One process per type per lead (can be reset/updated)
);

-- RLS for process_instances
alter table process_instances enable row level security;

create policy "Users can view process instances in their org"
    on process_instances for select
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));

create policy "Users can update process instances in their org"
    on process_instances for update
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));

create policy "Users can insert process instances in their org"
    on process_instances for insert
    with check (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));


-- 3. Pipeline Mapping (The "Bridge")
-- Maps a visual Pipeline Stage (UI) to a Process State (Engine)
-- This allows the UI to remain simple while the Engine enforces rules.
create table if not exists pipeline_process_map (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade not null,
    
    pipeline_stage_id uuid references pipeline_stages(id) on delete cascade not null,
    process_type text not null,
    process_state_key text not null,

    created_at timestamptz default now(),
    
    unique(pipeline_stage_id, process_type) -- A stage allows entering a specific state for a process type
);

-- RLS for mapping
alter table pipeline_process_map enable row level security;

create policy "Users can view mappings"
    on pipeline_process_map for select
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid()
    ));

create policy "Admins can manage mappings"
    on pipeline_process_map for all
    using (organization_id in (
        select organization_id from organization_members 
        where user_id = auth.uid() and role in ('owner', 'admin')
    ));

-- Indexes for performance
create index idx_process_instances_lead on process_instances(lead_id);
create index idx_process_instances_org on process_instances(organization_id);
create index idx_process_states_lookup on process_states(organization_id, type, key);
