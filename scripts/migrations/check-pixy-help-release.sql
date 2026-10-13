-- Read-only schema preflight for the reviewed help release. No customer data or secrets.
-- Run in the confirmed Supabase SQL editor or an authorized PostgreSQL connection.
-- Missing objects BEFORE migration are expected; mismatches AFTER migration block rollout.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH roles AS (SELECT to_regrole('anon') AS anon, to_regrole('authenticated') AS authenticated,
  to_regrole('service_role') AS service_role),
expected_migrations(version, name) AS (VALUES
  ('20261010000000', 'help_tenant_prerequisites'),
  ('20261011000000', 'atomic_tenant_provisioning'), ('20261011000001', 'platform_robot_pet'),
  ('20261011000003', 'help_chat_history'), ('20261012000004', 'tasks_portal_help'),
  ('20261012000005', 'dashboard_help_quota'), ('20261012000006', 'help_function_privileges')
), migration_history AS (
SELECT 'migration_history' AS section, e.version, e.name AS expected_name,
  m.version IS NOT NULL AS registered, m.name AS recorded_name,
  m.name = e.name AS name_matches
FROM expected_migrations e LEFT JOIN supabase_migrations.schema_migrations m ON m.version = e.version ORDER BY e.version
),

expected_columns(table_name, column_name) AS (VALUES
  ('organizations', 'id'), ('organizations', 'status'), ('organizations', 'parent_organization_id'),
  ('organization_members', 'organization_id'), ('organization_members', 'user_id'),
  ('organization_members', 'role'), ('organization_members', 'status'),
  ('organization_members', 'role_id'), ('organization_members', 'permissions'),
  ('organization_roles', 'id'), ('organization_roles', 'organization_id'),
  ('organization_roles', 'permissions'), ('organization_roles', 'hierarchy_level'),
  ('profiles', 'id'), ('profiles', 'platform_role'), ('platform_settings', 'id'),
  ('organization_staff', 'id'), ('organization_staff', 'organization_id'),
  ('organization_staff', 'access_token'), ('organization_staff', 'is_active'),
  ('organization_staff', 'user_id'), ('organization_staff', 'role'),
  ('organization_staff', 'task_role'), ('organization_staff', 'pin_code'),
  ('organization_staff', 'can_bulk_delete_tasks'),
  ('task_items', 'id'), ('task_items', 'organization_id'),
  ('task_items', 'project_id'), ('task_items', 'type'), ('task_items', 'external_meeting_id'),
  ('task_projects', 'id'), ('task_projects', 'organization_id'),
  ('task_projects', 'workspace_id'), ('task_projects', 'lead_staff_id'),
  ('task_workspaces', 'id'), ('task_workspaces', 'organization_id'), ('task_workspaces', 'lead_staff_id')
), baseline_columns AS (
SELECT 'baseline_columns' AS section, e.table_name, e.column_name,
  EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.' || e.table_name)
    AND a.attname = e.column_name AND NOT a.attisdropped) AS present
FROM expected_columns e ORDER BY e.table_name, e.column_name
),

expected_tables(table_name, audience) AS (VALUES
  ('help_chat_threads', 'dashboard'), ('help_chat_messages', 'dashboard'),
  ('help_portal_threads', 'portal'), ('help_portal_messages', 'portal'),
  ('help_portal_turns', 'portal'), ('help_portal_tenant_limits', 'portal'),
  ('help_portal_staff_limits', 'portal'), ('help_dashboard_tenant_limits', 'quota')
), help_tables AS (
SELECT 'help_tables' AS section, e.table_name, e.audience,
  c.oid IS NOT NULL AS present, c.relrowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count,
  has_table_privilege(r.anon, c.oid, 'SELECT') AS anon_select,
  has_table_privilege(r.anon, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') AS anon_write,
  has_table_privilege(r.authenticated, c.oid, 'SELECT') AS authenticated_select,
  has_table_privilege(r.authenticated, c.oid, 'INSERT') AS authenticated_insert,
  has_table_privilege(r.authenticated, c.oid, 'UPDATE,DELETE,TRUNCATE') AS authenticated_change,
  has_table_privilege(r.service_role, c.oid, 'SELECT') AS service_select,
  has_table_privilege(r.service_role, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') AS service_write
FROM expected_tables e CROSS JOIN roles r LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || e.table_name)
ORDER BY e.table_name
),

expected_functions(signature, audience) AS (VALUES
  ('public.can_access_help_tenant(uuid)', 'dashboard'),
  ('public.limit_help_chat_messages()', 'trigger'),
  ('public.reserve_dashboard_help_request(uuid)', 'quota'),
  ('public.begin_portal_help_turn(uuid,uuid,uuid,text,uuid)', 'portal'),
  ('public.finish_portal_help_turn(uuid,uuid,uuid,text,text[])', 'portal'),
  ('public.provision_tenant_atomic(uuid,text,jsonb,uuid,text,jsonb)', 'onboarding')
), help_functions AS (
SELECT 'help_functions' AS section, e.signature, e.audience, p.oid IS NOT NULL AS present,
  p.prosecdef AS security_definer, p.proconfig AS settings,
  has_function_privilege(r.anon, p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege(r.authenticated, p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege(r.service_role, p.oid, 'EXECUTE') AS service_execute
FROM expected_functions e CROSS JOIN roles r LEFT JOIN pg_proc p ON p.oid = to_regprocedure(e.signature)
ORDER BY e.signature
),

post_migration_objects AS (SELECT 'post_migration_objects' AS section,
  EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.platform_settings')
    AND attname = 'pet_config' AND NOT attisdropped AND atttypid = 'jsonb'::regtype AND attnotnull) AS pet_config_jsonb_not_null,
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.help_chat_messages')
    AND tgname = 'help_chat_message_limit' AND tgenabled = 'O' AND NOT tgisinternal) AS history_limit_trigger,
  to_regclass('public.tenant_provisioning_requests') IS NOT NULL AS onboarding_requests_present
),

-- Exposes only schema definitions, needed to compare actual policies with the reviewed migration.
dashboard_policies AS (SELECT 'dashboard_policies' AS section, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('help_chat_threads', 'help_chat_messages')
ORDER BY tablename, policyname
)
-- Single JSON result so SQL editors retain every section, not only the last table.
SELECT jsonb_build_object(
  'migration_history', (SELECT jsonb_agg(to_jsonb(r)) FROM migration_history r),
  'baseline_columns', (SELECT jsonb_agg(to_jsonb(r)) FROM baseline_columns r),
  'help_tables', (SELECT jsonb_agg(to_jsonb(r)) FROM help_tables r),
  'help_functions', (SELECT jsonb_agg(to_jsonb(r)) FROM help_functions r),
  'post_migration_objects', (SELECT to_jsonb(r) FROM post_migration_objects r),
  'dashboard_policies', coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM dashboard_policies r), '[]'::jsonb)
) AS help_release_preflight;
ROLLBACK;
