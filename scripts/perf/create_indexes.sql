-- Performance Indexes for Agency Manager
-- Run this in Supabase SQL Editor
-- 1. Organization Filters (Used in EVERY query)
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_org ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_org ON crm_tasks(organization_id);
-- 2. Status Filters (Used in Dashboard/Kanban)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id); -- For Joins
-- 3. Optimization for Recent Data (Partial Index Examples)
-- Optional: Index for open leads to speed up default pipeline view
CREATE INDEX IF NOT EXISTS idx_leads_open_created ON leads(created_at) WHERE status != 'lost' AND status != 'converted';