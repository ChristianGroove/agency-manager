-- Create messaging_templates table
create table if not exists messaging_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  channel_id uuid references integration_connections(id) on delete set null, -- Optional: template specific to a channel
  name text not null,
  content text not null,
  category text default 'text', -- 'text', 'hsm'
  language text default 'en',
  status text default 'active', -- 'active', 'rejected' (for HSM)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table messaging_templates enable row level security;

create policy "Users can view templates in their organization"
  on messaging_templates for select
  using (
    organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

create policy "Admins can manage templates"
  on messaging_templates for all
  using (
    exists (
      select 1 from organization_members
      where user_id = auth.uid()
      and organization_id = messaging_templates.organization_id
      and role in ('admin', 'owner', 'manager')
    )
  );

-- Indexes
create index idx_messaging_templates_org on messaging_templates(organization_id);
create index idx_messaging_templates_channel on messaging_templates(channel_id);
