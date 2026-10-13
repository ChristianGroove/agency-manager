// Real PostgreSQL sessions, only the verified local container. No provider calls or secrets.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
const execute = promisify(execFile)
const container = 'supabase_db_agency-manager'
const { stdout } = await execute('docker', ['inspect', container, '--format', '{{json .NetworkSettings.Ports}}'])
const ports = JSON.parse(stdout)['5432/tcp'] || []
assert(ports.length && ports.every(port => port.HostPort === '55322'), 'Incorrect local database target')
const organizationId = randomUUID()
const slug = `help-quota-concurrency-${organizationId}`
const fixtureUser = 'e608329a-39fb-47ab-a759-20624dbd5b5e'
const sql = async statement => {
    const result = await execute('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { timeout: 45000, maxBuffer: 100000 })
    return result.stdout.trim()
}
let created = false
try {
    await sql(`BEGIN; INSERT INTO public.organizations(id,name,slug,status) VALUES('${organizationId}','Help quota concurrency fixture','${slug}','active');
        INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES('${organizationId}','${fixtureUser}','member','active'); COMMIT;`)
    created = true
    const answers = await Promise.all(Array.from({ length: 20 }, async () => {
        const output = await sql(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${fixtureUser}',true);
            SELECT public.reserve_dashboard_help_request('${organizationId}')->>'status'; COMMIT;`)
        const statuses = output.split('\n').filter(line => ['allowed', 'rate_limited', 'denied'].includes(line))
        assert.equal(statuses.length, 1)
        return statuses[0]
    }))
    assert.equal(answers.filter(value => value === 'allowed').length, 10)
    assert.equal(answers.filter(value => value === 'rate_limited').length, 10)
    assert.equal(await sql(`SELECT request_count FROM public.help_dashboard_tenant_limits WHERE organization_id='${organizationId}'`), '10')
    console.log('Dashboard quota: 20 simultaneous PostgreSQL sessions -> 10 allowed, 10 limited; shared counter remains 10.')
} finally {
    if (created) {
        // Delete only the exact organization created by this invocation, never a preexisting tenant.
        await sql(`DELETE FROM public.organizations WHERE id='${organizationId}' AND slug='${slug}';`)
        assert.equal(await sql(`SELECT count(*) FROM public.organizations WHERE id='${organizationId}';`), '0')
        console.log('Temporary concurrency organization and its cascading quota rows removed.')
    }
}
