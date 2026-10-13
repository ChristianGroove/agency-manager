// Generates a reviewable SQL Editor batch; never connects to or modifies any database.
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'

const root = fs.realpathSync(process.cwd())
const sources = [
    '20260619022610_add_member_status',
    '20261011000001_platform_robot_pet',
    '20261011000003_help_chat_history',
    '20261012000004_tasks_portal_help',
    '20261012000005_dashboard_help_quota',
    '20261012000006_help_function_privileges',
].map(id => ({ version: id.slice(0, 14), name: id.slice(15), file: `supabase/migrations/${id}.sql`,
    sql: fs.readFileSync(path.join(root, `supabase/migrations/${id}.sql`), 'utf8').replace(/\r\n/g, '\n') }))
for (const source of sources) if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/mi.test(source.sql)) throw Error('Source already controls a transaction')
const output = path.join(root, 'scripts/migrations/pixy-help-production-20261013.sql')
const quote = text => "'" + text.replace(/'/g, "''") + "'"
const versions = sources.slice(1).map(source => quote(source.version)).join(', ')
const tables = ['help_chat_threads', 'help_chat_messages', 'help_portal_threads', 'help_portal_messages',
    'help_portal_turns', 'help_portal_staff_limits', 'help_portal_tenant_limits', 'help_dashboard_tenant_limits']
const functions = ['can_access_help_tenant(uuid)', 'limit_help_chat_messages()', 'reserve_dashboard_help_request(uuid)',
    'begin_portal_help_turn(uuid,uuid,uuid,text,uuid)', 'finish_portal_help_turn(uuid,uuid,uuid,text,text[])']
let result = `-- Prepared for the production preflight supplied on 2026-10-13.
-- Scope: missing member status prerequisite + five help migrations. No onboarding/Cartera.
-- Execute the entire file in the confirmed production Supabase SQL Editor.
-- Any failure rolls back the batch; never run only a selected fragment.
-- This does not deploy code, enable the robot, change tenant status or copy local configuration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtext('pixy-help-production-20261013'));
DO $guard$
DECLARE object_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN (${versions})) THEN
   RAISE EXCEPTION 'Help migrations already registered; reconcile before running this batch';
 END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260619022610'
   AND name IS DISTINCT FROM 'add_member_status') THEN
   RAISE EXCEPTION 'Member status migration version belongs to a different migration';
 END IF;
 FOREACH object_name IN ARRAY ARRAY[${tables.map(quote).join(', ')}] LOOP
   IF to_regclass('public.' || object_name) IS NOT NULL THEN
     RAISE EXCEPTION 'Help object already exists: %. Reconcile instead of overwriting', object_name;
   END IF;
 END LOOP;
 FOREACH object_name IN ARRAY ARRAY[${functions.map(quote).join(', ')}] LOOP
   IF to_regprocedure('public.' || object_name) IS NOT NULL THEN
     RAISE EXCEPTION 'Help function already exists: %. Reconcile instead of overwriting', object_name;
   END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.platform_settings')
   AND attname = 'pet_config' AND NOT attisdropped) THEN
   RAISE EXCEPTION 'Pet configuration already exists; compare before running this batch';
 END IF;
END;
$guard$;
`
for (const source of sources) {
    const digest = crypto.createHash('sha256').update(source.sql).digest('hex')
    const delimiter = `$source_${source.version}$`
    if (source.sql.includes(delimiter)) throw Error('Unexpected source delimiter')
    const registration = `INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
SELECT ${quote(source.version)}, ${quote(source.name)}, ARRAY[${delimiter}${source.sql}${delimiter}]`
    result += `\n-- Source: ${source.file}\n-- SHA-256 UTF-8 LF: ${digest}\n${source.sql}\n${registration}`
    result += source.version === '20260619022610'
        ? ` WHERE NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ${quote(source.version)});\n`
        : ';\n'
}
result += `
DO $verify$
DECLARE object_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.organization_members'::regclass
   AND attname='status' AND atttypid='text'::regtype AND NOT attisdropped) THEN
   RAISE EXCEPTION 'Member status column has an unexpected type';
 END IF;
 FOREACH object_name IN ARRAY ARRAY[${tables.map(quote).join(', ')}] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.' || object_name) AND relrowsecurity) THEN
     RAISE EXCEPTION 'Help table is missing RLS: %', object_name;
   END IF;
 END LOOP;
 IF has_function_privilege('anon','public.can_access_help_tenant(uuid)','EXECUTE')
   OR has_function_privilege('service_role','public.can_access_help_tenant(uuid)','EXECUTE')
   OR NOT has_function_privilege('authenticated','public.can_access_help_tenant(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected history predicate privileges';
 END IF;
 IF has_function_privilege('anon','public.limit_help_chat_messages()','EXECUTE')
   OR has_function_privilege('authenticated','public.limit_help_chat_messages()','EXECUTE')
   OR has_function_privilege('service_role','public.limit_help_chat_messages()','EXECUTE') THEN
   RAISE EXCEPTION 'Trigger function has unexpected direct callers';
 END IF;
 IF has_function_privilege('anon','public.reserve_dashboard_help_request(uuid)','EXECUTE')
   OR has_function_privilege('service_role','public.reserve_dashboard_help_request(uuid)','EXECUTE')
   OR NOT has_function_privilege('authenticated','public.reserve_dashboard_help_request(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected dashboard quota privileges';
 END IF;
END;
$verify$;
COMMIT;
SELECT 'applied' AS result, version, name FROM supabase_migrations.schema_migrations
 WHERE version IN ('20260619022610', ${versions}) ORDER BY version;
`
fs.writeFileSync(output, result)
console.log(`Prepared ${sources.length} migrations: ${path.relative(root, output)}. No database connection or changes.`)
