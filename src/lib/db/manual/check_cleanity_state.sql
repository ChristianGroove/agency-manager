-- Diagnostic to find 'cleanity2' and its current subscriptions
-- 1. Find Organization
SELECT id, name, slug FROM organizations WHERE name ILIKE '%cleanity%' OR slug ILIKE '%cleanity%';

-- 2. List all SaaS Products to identify the legacy "Cleaning App"
SELECT id, name, slug, is_active FROM saas_products;

-- 3. List all Modules to identify 'fuerzalaboral', 'operaciones'
SELECT id, name, slug, is_legacy FROM modules;
