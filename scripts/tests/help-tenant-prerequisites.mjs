// Ephemeral schema fixtures; no live database or customer records.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const migration = fs.readFileSync('supabase/migrations/20261010000000_help_tenant_prerequisites.sql', 'utf8')
const db = new PGlite()
try {
    await db.exec(`CREATE TABLE organization_members(id integer PRIMARY KEY,role text);
      CREATE TABLE service_categories(id integer PRIMARY KEY,name text);
      CREATE TABLE platform_access_invitations(id integer PRIMARY KEY,code text);
      INSERT INTO organization_members VALUES(1,'owner');
      INSERT INTO service_categories VALUES(1,'Fixture');
      INSERT INTO platform_access_invitations VALUES(1,'FIXTURE');`)
    await db.exec(migration)
    assert.deepEqual((await db.query('SELECT role,status FROM organization_members')).rows, [{ role: 'owner', status: 'active' }])
    assert.equal((await db.query('SELECT is_active FROM service_categories')).rows[0].is_active, true)
    assert.equal((await db.query('SELECT target_organization_type FROM platform_access_invitations')).rows[0].target_organization_type, 'client')
    await db.exec("UPDATE organization_members SET status='blocked'; UPDATE service_categories SET is_active=false; UPDATE platform_access_invitations SET target_organization_type='reseller';")
    await db.exec(migration)
    assert.equal((await db.query('SELECT status FROM organization_members')).rows[0].status, 'blocked')
    assert.equal((await db.query('SELECT is_active FROM service_categories')).rows[0].is_active, false)
    assert.equal((await db.query('SELECT target_organization_type FROM platform_access_invitations')).rows[0].target_organization_type, 'reseller')
    console.log('Prerequisites: adds missing columns/defaults and preserves existing roles, blocked/inactive/reseller state on repeat.')
} finally { await db.close() }
