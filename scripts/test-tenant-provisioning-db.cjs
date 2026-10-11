// PostgreSQL regression suite using an ephemeral in-memory engine. No live DB or email.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const actor = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const third = '00000000-0000-4000-8000-000000000003';
const defaults = { roles: [{ name: 'Dueño', hierarchy_level: 100, permissions: { all: true } }], categories: [],
    crm: { name: 'Agency', processStates: [{ type: 'sale', key: 'lead', name: 'Lead', is_initial: true }],
        pipelineStages: [{ name: 'Lead', key: 'lead', color: 'blue', mapToProcessKey: 'lead' }] } };

async function database() {
    const db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}');
        CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(current_setting('request.jwt.claim.role',true),'service_role') $$;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
        CREATE TYPE public.subscription_status AS ENUM ('active','past_due','canceled');`);
    const baseline = fs.readFileSync(path.join(root, 'supabase/migrations/20260409000000_baseline.sql'), 'utf8');
    const tables = ['organizations','organization_members','organization_settings','saas_subscriptions', 'profiles',
        'saas_apps','saas_app_modules','saas_products','organization_roles','service_categories','pipelines','pipeline_stages','pipeline_process_map','process_states'];
    for (const table of tables) {
        const statement = baseline.match(new RegExp('CREATE TABLE IF NOT EXISTS "public"\\."'+table+'" \\([\\s\\S]+?\n\\);'))?.[0];
        assert.ok(statement, `baseline table ${table}`);
        await db.exec(statement.replaceAll('"extensions"."uuid_generate_v4"()', 'gen_random_uuid()'));
    }
    await db.exec(`ALTER TABLE organizations ADD PRIMARY KEY(id), ADD UNIQUE(slug), ADD COLUMN provisioned_by uuid REFERENCES auth.users;
        ALTER TABLE organization_members ADD PRIMARY KEY(organization_id,user_id), ADD COLUMN status text DEFAULT 'active',
            ADD FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE, ADD FOREIGN KEY(user_id) REFERENCES auth.users(id);
        ALTER TABLE saas_apps ADD PRIMARY KEY(id);
        ALTER TABLE organizations ADD FOREIGN KEY(owner_id) REFERENCES auth.users(id);
        ALTER TABLE saas_subscriptions ADD FOREIGN KEY(plan_id) REFERENCES saas_apps(id);
        ALTER TABLE organization_settings ADD COLUMN portal_theme_config jsonb DEFAULT '{}';
        ALTER TABLE service_categories ADD COLUMN is_active boolean DEFAULT true;`);
    const assignment = baseline.match(/CREATE OR REPLACE FUNCTION "public"\."assign_app_to_organization"[\s\S]+?\$\$;/)?.[0];
    assert.ok(assignment, 'baseline app assignment function');
    await db.exec(assignment);
    const defaultStages = baseline.match(/CREATE OR REPLACE FUNCTION "public"\."create_default_pipeline_stages"[\s\S]+?\$\$;/)?.[0];
    assert.ok(defaultStages, 'baseline stage initialization trigger');
    await db.exec(defaultStages);
    await db.exec('CREATE TRIGGER trigger_create_default_pipeline_stages AFTER INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION create_default_pipeline_stages()');
    await db.exec(`CREATE TABLE platform_access_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text UNIQUE NOT NULL,recipient_email text,target_app_id text,
        target_organization_type text DEFAULT 'client',reseller_org_id uuid,max_uses integer DEFAULT 1,uses_count integer DEFAULT 0,
        status text DEFAULT 'active',expires_at timestamptz);
        ALTER TABLE platform_access_invitations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY org_members_manage_access_invitations ON platform_access_invitations FOR ALL TO authenticated USING (true);
        CREATE POLICY public_read_active_access_invitations ON platform_access_invitations FOR SELECT USING (status = 'active');
        GRANT ALL ON platform_access_invitations TO anon,authenticated;
        INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
            ('${actor}','admin@example.com','{}'),('${other}','owner@example.com','{"onboarding_invite_code":"INV-TEST"}'),
            ('${third}','third@example.com','{"onboarding_invite_code":"INV-TEST"}');
        INSERT INTO profiles(id,platform_role) VALUES ('${actor}','super_admin');
        INSERT INTO saas_apps(id,name,slug) VALUES ('app','SaaS Space','saas');
        INSERT INTO platform_access_invitations(code) VALUES ('INV-TEST');`);
    await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261011000000_atomic_tenant_provisioning.sql'),'utf8'));
    return db;
}
async function provision(db, who = actor, key = 'request', invite = null, input = {}) {
    return (await db.query('SELECT provision_tenant_atomic($1,$2,$3,$4,$5,$6) AS result', [who,key,
        {name:'Empresa',slug:'empresa',app_id:'app',admin_email:invite ? null : 'owner@example.com',...input},other,invite,defaults])).rows[0].result;
}

test('same direct request returns the same tenant and creates one complete core', async () => {
    const db = await database();
    try {
        const [a,b] = await Promise.all([provision(db),provision(db)]);
        assert.equal(a.organization.id,b.organization.id);
        assert.equal(b.reused,true);
        for (const table of ['organizations','organization_settings','saas_subscriptions','organization_roles','pipelines','process_states','pipeline_stages','pipeline_process_map']) {
            assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,1,table);
        }
        const members=(await db.query('SELECT user_id,role,permissions FROM organization_members ORDER BY role')).rows;
        assert.equal(members.length,2);
        assert.equal(members.find(m=>m.user_id===other).role,'owner');
        assert.equal(members.find(m=>m.user_id===actor).permissions.is_support_proxy,true);
    } finally { await db.close(); }
});
test('two onboarding submissions consume once, even with different keys/input', async () => {
    const db=await database();
    try {
        const [a,b]=await Promise.all([provision(db,other,'tab1','INV-TEST'),provision(db,other,'tab2','INV-TEST',{slug:'different'})]);
        assert.equal(a.organization.id,b.organization.id);
        assert.deepEqual((await db.query('SELECT uses_count,status FROM platform_access_invitations')).rows[0],{uses_count:1,status:'exhausted'});
    } finally { await db.close(); }
});
test('two accounts compete for the final invitation slot; only one succeeds', async () => {
    const db=await database();
    try {
        const results=await Promise.allSettled([provision(db,other,'tab','INV-TEST'),provision(db,third,'tab','INV-TEST',{slug:'third'})]);
        assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM organizations')).rows[0].n,1);
        assert.equal((await db.query('SELECT uses_count FROM platform_access_invitations')).rows[0].uses_count,1);
    } finally { await db.close(); }
});
test('subscription/CRM failure rolls back all tenant rows and invitation consumption', async () => {
    const db=await database();
    try {
        await db.exec(`CREATE FUNCTION reject_pipeline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$;
            CREATE TRIGGER reject_pipeline BEFORE INSERT ON pipelines FOR EACH ROW EXECUTE FUNCTION reject_pipeline();`);
        await assert.rejects(provision(db,other,'request','INV-TEST'),/simulated failure/);
        for (const table of ['organizations','organization_members','organization_settings','organization_roles','saas_subscriptions','process_states','tenant_provisioning_requests']) {
            assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,0,table);
        }
        assert.equal((await db.query('SELECT uses_count FROM platform_access_invitations')).rows[0].uses_count,0);
        await db.exec('DROP TRIGGER reject_pipeline ON pipelines');
        assert.ok((await provision(db,other,'request','INV-TEST')).organization.id);
    } finally { await db.close(); }
});
test('recipient, expiry, revoked status and reseller scope are enforced inside the transaction', async () => {
    const db=await database();
    try {
        await db.exec("UPDATE platform_access_invitations SET recipient_email='wrong@example.com'");
        await assert.rejects(provision(db,other,'r','INV-TEST'),/no corresponde/);
        await db.exec("UPDATE platform_access_invitations SET recipient_email=NULL,expires_at=now()-interval '1 day'");
        await assert.rejects(provision(db,other,'r','INV-TEST'),/expiró/);
        await db.exec("UPDATE platform_access_invitations SET expires_at=NULL,status='revoked'");
        await assert.rejects(provision(db,other,'r','INV-TEST'),/expiró/);
        await assert.rejects(provision(db,third),/permiso/);
    } finally { await db.close(); }
});
test('public roles cannot read/update invitation rows or invoke privileged RPCs', async () => {
    const db=await database();
    try {
        for (const role of ['anon','authenticated']) {
            await db.exec('SET ROLE '+role);
            await assert.rejects(db.query('SELECT * FROM platform_access_invitations'),/permission denied/);
            await assert.rejects(db.query("UPDATE platform_access_invitations SET uses_count=100"),/permission denied/);
            await assert.rejects(provision(db),/permission denied/);
            await db.exec('RESET ROLE');
        }
    } finally { await db.close(); }
});
test('delivery claims deduplicate, persist failure, permit retry, and reject stale completion', async () => {
    const db=await database();
    try {
        const id=(await provision(db)).organization.id;
        const claim=async(resend=false)=>(await db.query('SELECT claim_tenant_activation($1,$2) AS r',[id,resend])).rows[0].r;
        const first=await claim();
        assert.equal(first.claimed,true);
        assert.equal((await claim(true)).claimed,false);
        await db.query('SELECT finish_tenant_activation($1,$2,$3)',[id,first.claim_id,'mail failed']);
        await db.exec("UPDATE tenant_provisioning_requests SET activation_attempted_at=now()-interval '2 minutes'");
        const retry=await claim(true);
        await assert.rejects(db.query('SELECT finish_tenant_activation($1,$2,NULL)',[id,first.claim_id]),/no está vigente/);
        await db.query('SELECT finish_tenant_activation($1,$2,NULL)',[id,retry.claim_id]);
        assert.equal((await claim()).already_sent,true);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM organizations')).rows[0].n,1);
    } finally { await db.close(); }
});
test('shared app assignment stores JSON modules and denies unauthorized application changes', async () => {
    const db=await database();
    try {
        await db.exec("UPDATE saas_apps SET space_category='real_estate'; INSERT INTO saas_app_modules(app_id,module_key,auto_enable,sort_order) VALUES ('app','crm',true,1)");
        const org=(await provision(db)).organization;
        assert.equal(org.vertical_key,'real_estate');
        assert.deepEqual(org.manual_module_overrides,['crm']);
        await db.exec("SET ROLE authenticated; SET request.jwt.claim.role='authenticated'");
        await assert.rejects(db.query('SELECT assign_app_to_organization($1,$2,true)',[org.id,'app']),/permiso/);
    } finally { await db.close(); }
});
test('historical repair fills a missing owner reference only from a unique active owner', async () => {
    const db=await database();
    try {
        const id=(await provision(db)).organization.id;
        await db.query('UPDATE organizations SET owner_id=NULL WHERE id=$1',[id]);
        await db.query('SELECT repair_tenant_ownership($1,$2)',[id,other]);
        assert.equal((await db.query('SELECT owner_id FROM organizations WHERE id=$1',[id])).rows[0].owner_id,other);
        await db.query('UPDATE organizations SET owner_id=NULL WHERE id=$1',[id]);
        await db.query("UPDATE organization_members SET status='blocked' WHERE organization_id=$1 AND user_id=$2",[id,other]);
        await assert.rejects(db.query('SELECT repair_tenant_ownership($1,$2)',[id,other]),/propietario verificable/);
    } finally { await db.close(); }
});
test('historical repair recovers trusted invitation metadata but rejects editable metadata and stale proposals', async () => {
    const db=await database();
    try {
        const id=(await provision(db)).organization.id;
        await db.query('UPDATE organizations SET owner_id=NULL WHERE id=$1',[id]);
        await db.query('DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2',[id,other]);
        await db.query("UPDATE auth.users SET raw_user_meta_data=jsonb_build_object('invited_org_id',$1::text) WHERE id=$2",[id,other]);
        await assert.rejects(db.query('SELECT repair_tenant_ownership($1,$2)',[id,other]),/propietario verificable/);
        await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('invited_org_id',$1::text) WHERE id=$2",[id,other]);
        await assert.rejects(db.query('SELECT repair_tenant_ownership($1,$2)',[id,third]),/cambiaron/);
        await db.query('SELECT repair_tenant_ownership($1,$2)',[id,other]);
        assert.equal((await db.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2',[id,other])).rows[0].role,'owner');
    } finally { await db.close(); }
});
