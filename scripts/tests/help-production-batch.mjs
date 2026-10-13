// Isolated PostgreSQL-compatible fixtures only. No live database or provider calls.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const batch = fs.readFileSync('scripts/migrations/pixy-help-production-20261013.sql', 'utf8')
async function baseline() {
    const db = new PGlite()
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        CREATE TABLE public.organizations(id uuid PRIMARY KEY, parent_organization_id uuid, status text);
        CREATE TABLE public.organization_members(organization_id uuid, user_id uuid, role text);
        CREATE TABLE public.profiles(id uuid, platform_role text);
        CREATE TABLE public.organization_staff(id uuid PRIMARY KEY, organization_id uuid, is_active boolean);
        CREATE TABLE public.platform_settings(id uuid PRIMARY KEY);
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY, name text, statements text[]);
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
        INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001');
        INSERT INTO organizations VALUES('00000000-0000-4000-8000-000000000002',null,'active');
        INSERT INTO organization_members VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','member');`)
    return db
}
async function rollbackAfterFailure(db, sql) {
    await assert.rejects(db.exec(sql))
    await db.exec('ROLLBACK')
}
const success = await baseline()
try {
    await success.exec(batch)
    assert.equal((await success.query('SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations')).rows[0].n, 6)
    assert.equal((await success.query("SELECT status FROM organization_members")).rows[0].status, 'active')
    const tables = await success.query("SELECT count(*)::int AS n FROM pg_class WHERE relname LIKE 'help_%' AND relkind='r' AND relrowsecurity")
    assert.equal(tables.rows[0].n, 8)
    await success.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
      INSERT INTO help_chat_threads(organization_id,title) VALUES('00000000-0000-4000-8000-000000000002','Fixture');
      INSERT INTO help_chat_messages(thread_id,role,content) SELECT id,'user','Pregunta' FROM help_chat_threads;
      RESET ROLE;`)
    await rollbackAfterFailure(success, batch)
    assert.equal((await success.query('SELECT count(*)::int AS n FROM help_chat_messages')).rows[0].n, 1)
    console.log('Fresh schema, grants, authenticated history/trigger, registration and repeat refusal: passed.')
} finally { await success.close() }
for (const conflicting of ['existing-table', 'version-collision', 'late-error']) {
    const db = await baseline()
    try {
        if (conflicting === 'existing-table') await db.exec('CREATE TABLE help_portal_threads(sentinel integer); INSERT INTO help_portal_threads VALUES(42);')
        if (conflicting === 'version-collision') await db.exec("INSERT INTO supabase_migrations.schema_migrations VALUES('20260619022610','unrelated',null)")
        const input = conflicting === 'late-error' ? batch.replace(/\nCOMMIT;\n/, '\nSELECT 1/0;\nCOMMIT;\n') : batch
        await rollbackAfterFailure(db, input)
        assert.equal((await db.query("SELECT to_regclass('public.help_chat_threads') IS NULL AS absent")).rows[0].absent, true)
        assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='public.organization_members'::regclass AND attname='status' AND NOT attisdropped")).rows[0].n, 0)
        assert.equal((await db.query('SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations')).rows[0].n, conflicting === 'version-collision' ? 1 : 0)
        if (conflicting === 'existing-table') assert.equal((await db.query('SELECT sentinel FROM help_portal_threads')).rows[0].sentinel, 42)
        console.log(`${conflicting}: rejected without partial changes.`)
    } finally { await db.close() }
}
