
create table if not exists agent_qa_reports (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid not null references organizations(id) on delete cascade,
    agent_id text not null, -- User ID or External ID
    report jsonb not null,
    messages_analyzed_count int default 0,
    period_start timestamptz,
    period_end timestamptz,
    created_at timestamptz default now()
);

-- Index for fast lookup
create index idx_agent_qa_reports_lookup 
on agent_qa_reports(organization_id, agent_id, created_at desc);

-- RLS
alter table agent_qa_reports enable row level security;

create policy "Admins can view reports"
    on agent_qa_reports for select
    using (
        organization_id in (
            select organization_id from organization_members 
            where user_id = auth.uid()
        )
    );
