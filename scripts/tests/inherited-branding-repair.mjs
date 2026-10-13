import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const { PGlite } = await import(process.env.BRANDING_TEST_PGLITE_MODULE || '@electric-sql/pglite')

const sql = fs.readFileSync(new URL('../migrations/reconcile-inherited-branding-20261013.sql', import.meta.url), 'utf8')
const prefix = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/'
const old = [prefix + '1769815057247_rgx43z2xg.png', prefix + '1769815064697_1yqivrsbn.png', prefix + '1767709889548_3ngmixl7c.svg']
const portal = prefix + '1769815075373_8c3c1nnuk.png'
const ids = ['83e85d20-09b5-46db-b709-4248444213c6', 'f0547001-6027-408b-8a89-ee73be73d3fa', '11111111-1111-4111-8111-111111111111']

async function fixture() {
    const db = new PGlite()
    await db.exec(`CREATE TABLE platform_settings(id int,main_logo_url text,main_logo_light_url text,favicon_url text);
        INSERT INTO platform_settings VALUES(1,'/new.svg','/new-light.svg','/new-icon.svg');
        CREATE TABLE organizations(id uuid PRIMARY KEY,slug text);
        CREATE TABLE organization_settings(organization_id uuid PRIMARY KEY,main_logo_url text,main_logo_light_url text,isotipo_url text,portal_logo_url text,agency_name text,updated_at timestamptz);`)
    for (const [index, id] of ids.entries()) {
        await db.query('INSERT INTO organizations VALUES($1,$2)', [id, ['karla-tanco','retail-demo','other-company'][index]])
        await db.query("INSERT INTO organization_settings VALUES($1,$2,$3,$4,$5,$6,'2026-01-01')", [id,...old,portal,`Company ${index}`])
    }
    return db
}

test('repairs exactly the two intended tenants while preserving portal and business settings', async () => {
    const db = await fixture()
    try {
        await db.exec(sql)
        const rows = (await db.query('SELECT * FROM organization_settings ORDER BY agency_name')).rows
        for (const row of rows.slice(0,2)) {
            assert.equal(row.main_logo_url,null)
            assert.equal(row.main_logo_light_url,null)
            assert.equal(row.isotipo_url,null)
            assert.equal(row.portal_logo_url,portal)
            assert.match(row.agency_name,/Company/)
        }
        assert.equal(rows[2].main_logo_url,old[0])
        assert.equal(rows[2].main_logo_light_url,old[1])
        assert.equal(rows[2].isotipo_url,old[2])
    } finally { await db.close() }
})

test('preserves any real custom logo saved after diagnosis and remains idempotent', async () => {
    const db = await fixture()
    try {
        await db.query('UPDATE organization_settings SET main_logo_url=$1 WHERE organization_id=$2',['/new-custom-company.svg',ids[0]])
        await db.exec(sql)
        const first = (await db.query('SELECT * FROM organization_settings ORDER BY agency_name')).rows
        await db.exec(sql)
        const second = (await db.query('SELECT * FROM organization_settings ORDER BY agency_name')).rows
        assert.equal(first[0].main_logo_url,'/new-custom-company.svg')
        assert.equal(first[0].main_logo_light_url,null)
        assert.deepEqual(second,first)
    } finally { await db.close() }
})

test('rejects repair if the global logos have not been recovered', async () => {
    const db = await fixture()
    try {
        await db.query('UPDATE platform_settings SET main_logo_url=$1',[old[0]])
        await assert.rejects(db.exec(sql),/Global branding must be repaired/)
        await db.exec('ROLLBACK')
        assert.equal((await db.query('SELECT main_logo_url FROM organization_settings WHERE organization_id=$1',[ids[0]])).rows[0].main_logo_url,old[0])
    } finally { await db.close() }
})

test('does not modify a tenant whose identity no longer matches the approved target', async () => {
    const db = await fixture()
    try {
        await db.query('UPDATE organizations SET slug=$1 WHERE id=$2',['another-tenant',ids[0]])
        await db.exec(sql)
        assert.equal((await db.query('SELECT main_logo_url FROM organization_settings WHERE organization_id=$1',[ids[0]])).rows[0].main_logo_url,old[0])
    } finally { await db.close() }
})
