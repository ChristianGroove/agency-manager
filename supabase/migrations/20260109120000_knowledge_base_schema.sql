-- Enable Vector Extension
create extension if not exists vector with schema extensions;

-- Create Knowledge Base Table
create table if not exists knowledge_base (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    question text not null,
    answer text not null,
    category text default 'General',
    source text default 'manual', -- 'ai_extracted', 'manual', 'file'
    tags text[] default array[]::text[],
    embedding vector(1536), -- For future vector search
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_knowledge_base_org on knowledge_base(organization_id);
create index if not exists idx_knowledge_base_category on knowledge_base(organization_id, category);

-- RLS Policies
alter table knowledge_base enable row level security;

-- Policy: Select (View)
create policy "Users can view knowledge base of their organization"
    on knowledge_base for select
    using (
        organization_id in (
            select organization_id from organization_members
            where user_id = auth.uid()
        )
    );

-- Policy: Insert (Add)
create policy "Users can add to knowledge base"
    on knowledge_base for insert
    with check (
        organization_id in (
            select organization_id from organization_members
            where user_id = auth.uid()
        )
    );

-- Policy: Update (Edit)
create policy "Users can update knowledge base"
    on knowledge_base for update
    using (
        organization_id in (
            select organization_id from organization_members
            where user_id = auth.uid()
        )
    );

-- Policy: Delete (Remove)
create policy "Users can delete from knowledge base"
    on knowledge_base for delete
    using (
        organization_id in (
            select organization_id from organization_members
            where user_id = auth.uid()
        )
    );
