// Synthetic fixtures only; never publishes Gemini drafts or changes the real corpus.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import yaml from 'js-yaml'

const workspace = fs.realpathSync(process.cwd())
const parent = path.join(workspace, 'tmp')
fs.mkdirSync(parent, { recursive: true })
const fixture = fs.mkdtempSync(path.join(parent, 'help-pipeline-'))
const sha = data => crypto.createHash('sha256').update(data).digest('hex')
const articleDir = path.join(fixture, 'docs/1-product/help-library/drafts/articles')
const evidencePath = 'src/app/(dashboard)/dashboard/page.tsx'
const evidence = 'export function ThemeButton() { return null }'
for (const dir of [articleDir, path.dirname(path.join(fixture, evidencePath)), path.join(fixture, 'src/modules/features/caa/library')]) fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(fixture, evidencePath), evidence)
const content = '## Cambiar el tema\nUsa el botón del sidebar para alternar entre tema claro y oscuro. La selección se aplica sin guardar y no requiere abrir un menú.\n\n## Notas de verificación\nInformación interna que no debe publicarse.'
const meta = { schema_version: 1, id: 'dashboard.theme', title: 'Cambiar el tema', module: 'dashboard', status: 'draft', audience: 'tenant-user', source_revision: 'a'.repeat(40), verified_on: '2026-10-12', verification: 'source-only', routes: ['/dashboard'], keywords: ['tema'], requirements: [], evidence: [{ path: evidencePath, symbol: 'ThemeButton', claim: 'Existe el control' }] }
const filename = path.join(articleDir, 'dashboard.theme.md')
const writeDraft = data => fs.writeFileSync(filename, `---\n${yaml.dump(data, { schema: yaml.JSON_SCHEMA })}---\n${content}`)
const run = (...args) => spawnSync(process.execPath, [path.join(workspace, 'node_modules/tsx/dist/cli.mjs'), path.join(workspace, 'scripts/help-library.mjs'), ...args], {
    cwd: fixture, encoding: 'utf8', env: { ...process.env, TSX_TSCONFIG_PATH: path.join(workspace, 'tsconfig.json') },
})
try {
    writeDraft(meta)
    const validation = run('validate')
    assert.equal(validation.status, 0, validation.stderr)
    assert.notEqual(run('publish').status, 0, 'Publication without review must fail')
    const reviewPath = path.join(fixture, 'review.json')
    const review = { schema_version: 1, articles: [{ id: meta.id, draft_sha256: sha(fs.readFileSync(filename, 'utf8')), reviewed_by: 'Synthetic reviewer', reviewed_on: '2026-10-12', evidence_sha256: { [evidencePath]: sha(evidence) }, required_modules: [], required_permissions: [], verticals: [], link_route: '/dashboard' }] }
    fs.writeFileSync(reviewPath, JSON.stringify(review))
    const result = run('publish', reviewPath)
    assert.equal(result.status, 0, result.stderr)
    const output = path.join(fixture, 'src/modules/features/caa/library/published.json')
    const artifact = fs.readFileSync(output, 'utf8')
    assert.equal(JSON.parse(artifact).articles.length, 1)
    assert(!artifact.includes('Información interna'))
    assert(!artifact.includes('evidence'))
    fs.appendFileSync(path.join(fixture, evidencePath), '\n// changed')
    assert.notEqual(run('publish', reviewPath).status, 0, 'Changed source evidence must fail')
    assert.equal(fs.readFileSync(output, 'utf8'), artifact, 'Failed publication must preserve old corpus')
    fs.writeFileSync(path.join(fixture, evidencePath), evidence)
    // Portable reviews accept CRLF/LF differences only, producing the same published text.
    writeDraft(meta)
    const multilineEvidence = evidence + '\n// reviewed second line\n'
    fs.writeFileSync(path.join(fixture, evidencePath), multilineEvidence)
    const portableReview = { ...review, hash_encoding: 'utf8-lf', articles: [{ ...review.articles[0],
        draft_sha256: sha(fs.readFileSync(filename, 'utf8')), evidence_sha256: { [evidencePath]: sha(multilineEvidence) } }] }
    fs.writeFileSync(reviewPath, JSON.stringify(portableReview))
    assert.equal(run('publish', reviewPath).status, 0)
    const portableArtifact = fs.readFileSync(output, 'utf8')
    fs.writeFileSync(filename, fs.readFileSync(filename, 'utf8').replace(/\n/g, '\r\n'))
    fs.writeFileSync(path.join(fixture, evidencePath), multilineEvidence.replace(/\n/g, '\r\n'))
    const portableResult = run('publish', reviewPath)
    assert.equal(portableResult.status, 0, portableResult.stderr)
    assert.equal(fs.readFileSync(output, 'utf8'), portableArtifact, 'LF and CRLF must publish identical content')
    fs.writeFileSync(reviewPath, JSON.stringify({ ...portableReview, hash_encoding: undefined }))
    assert.notEqual(run('publish', reviewPath).status, 0, 'Historical exact-byte reviews must still reject changed line endings')
    fs.writeFileSync(reviewPath, JSON.stringify(portableReview))
    fs.appendFileSync(path.join(fixture, evidencePath), '// substantive change')
    assert.notEqual(run('publish', reviewPath).status, 0, 'Portable reviews must reject substantive evidence changes')
    assert.equal(fs.readFileSync(output, 'utf8'), portableArtifact)
    fs.writeFileSync(path.join(fixture, evidencePath), multilineEvidence)
    fs.appendFileSync(filename, '\nChanged article')
    assert.notEqual(run('publish', reviewPath).status, 0, 'Portable reviews must reject substantive draft changes')
    assert.equal(fs.readFileSync(output, 'utf8'), portableArtifact)
    // Restore the legacy fixture for the remaining rejection tests.
    writeDraft(meta)
    fs.writeFileSync(path.join(fixture, evidencePath), evidence)
    fs.writeFileSync(output, artifact)
    writeDraft({ ...meta, evidence: [{ ...meta.evidence[0], path: '../secret.txt' }] })
    assert.notEqual(run('validate').status, 0, 'Path traversal must fail')
    writeDraft({ ...meta, routes: ['/nonexistent'] })
    assert.notEqual(run('validate').status, 0, 'Invented route must fail')
    const portalPath = 'src/app/(public)/portal/tasks/[token]/page.tsx'
    fs.mkdirSync(path.dirname(path.join(fixture, portalPath)), { recursive: true })
    fs.writeFileSync(path.join(fixture, portalPath), 'export function TaskPortalGate() { return null }')
    const portalMeta = { ...meta, id: 'tasks-portal.navigation', module: 'tasks', surface: 'portal.tasks', audience: 'portal-collaborator',
        routes: ['/portal/tasks/[token]'], evidence: [{ path: portalPath, symbol: 'TaskPortalGate', claim: 'Existe el portal' }] }
    writeDraft(portalMeta)
    const approval = { ...review.articles[0], id: portalMeta.id, draft_sha256: sha(fs.readFileSync(filename, 'utf8')),
        evidence_sha256: { [portalPath]: sha(fs.readFileSync(path.join(fixture, portalPath), 'utf8')) }, required_modules: ['module_tasks'], link_route: null }
    fs.writeFileSync(reviewPath, JSON.stringify({ ...review, articles: [approval] }))
    assert.notEqual(run('publish', reviewPath).status, 0, 'Portal publication without profiles must fail')
    assert.equal(fs.readFileSync(output, 'utf8'), artifact, 'Rejected portal article must preserve old corpus')
    fs.writeFileSync(reviewPath, JSON.stringify({ ...review, articles: [{ ...approval, portal_profiles: ['collaborator'] }] }))
    const portalResult = run('publish', reviewPath)
    assert.equal(portalResult.status, 0, portalResult.stderr)
    const portalArticle = JSON.parse(fs.readFileSync(output, 'utf8')).articles[0]
    assert.equal(portalArticle.surface, 'portal.tasks')
    assert.deepEqual(portalArticle.portal_profiles, ['collaborator'])
    writeDraft({ ...portalMeta, routes: ['/portal/tasks/actual-token'] })
    assert.notEqual(run('validate').status, 0, 'Concrete token routes must not be published')
    console.log('Publication pipeline: dashboard and portal assertions passed; only synthetic fixtures used.')
} finally {
    const resolved = fs.realpathSync(fixture)
    if (!resolved.startsWith(fs.realpathSync(parent) + path.sep)) throw new Error('Fixture cleanup outside workspace')
    fs.rmSync(resolved, { recursive: true })
}
