// One-time mechanical merge of reviewed deliveries; never manufactures evidence hashes.
import fs from 'node:fs'
import crypto from 'node:crypto'
import * as SchemaModule from '../src/modules/features/caa/library/schema.ts'
const { reviewSchema } = SchemaModule.default || SchemaModule
const root = 'docs/1-product/help-library'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha = text => crypto.createHash('sha256').update(text).digest('hex')
const output = `${root}/reviews/tasks-combined-reviewed-20261012.json`
if (fs.existsSync(output)) throw new Error('Historical snapshot already exists; prepare a new reviewed snapshot.')
const baseline = reviewSchema.parse(read(`${root}/reviews/public-language-reviewed-20261012.json`))
const portal = reviewSchema.parse(read(`${root}/reviews/tasks-portal-reviewed-final-20261012.json`))
const proposal = read(`${root}/dashboard-preparation/tasks/publication-proposal.json`)
const dashboard = reviewSchema.parse({ schema_version: 1, articles: proposal.articles.map(({ replaces, ...entry }) => entry) })
if (dashboard.articles.length !== 6) throw new Error('Expected six reviewed dashboard guides')
const entries = baseline.articles.filter(entry => !entry.id.startsWith('tasks-portal.'))
const portalEntries = portal.articles.filter(entry => entry.id.startsWith('tasks-portal.'))
if (portalEntries.length !== 22 || portalEntries.some(entry => entry.id === 'tasks-portal.technical-capabilities')) throw new Error('Unexpected portal catalogue')
entries.push(...portalEntries)
const copies = []
for (const entry of dashboard.articles) {
    const source = `${root}/dashboard-preparation/tasks/articles/${entry.id}.md`
    if (!/^tasks\.[a-z0-9.-]+$/.test(entry.id) || sha(fs.readFileSync(source, 'utf8')) !== entry.draft_sha256) throw new Error(`Unreviewed dashboard draft: ${entry.id}`)
    const original = proposal.articles.find(candidate => candidate.id === entry.id)
    if (original.replaces && original.replaces !== entry.id) throw new Error(`Unsupported replacement: ${entry.id}`)
    const index = entries.findIndex(candidate => candidate.id === entry.id)
    if ((index >= 0) !== !!original.replaces) throw new Error(`Replacement declaration mismatch: ${entry.id}`)
    // Both guides mix read-only views with management procedures. Their reviewed matrix
    // requires management for state changes and sprint mutations. Keep general navigation
    // available through tasks.manage-tasks without broadening those procedures.
    if (['tasks.sprint-planning-and-pacing', 'tasks.task-lifecycle-and-views'].includes(entry.id)) {
        entry.required_permissions = ['operations.tasks.view', 'operations.tasks.manage']
        entry.reviewed_by = 'Gemini (editorial); Codex (conservative access mapping from reviewed matrix)'
    }
    if (index >= 0) entries[index] = entry
    else entries.push(entry)
    copies.push([source, `${root}/drafts/articles/${entry.id}.md`])
}
const snapshot = reviewSchema.parse({ schema_version: 1, articles: entries })
if (snapshot.articles.length !== 48 || new Set(entries.map(entry => entry.id)).size !== 48) throw new Error('Expected 48 unique guides')
for (const entry of snapshot.articles) {
    for (const [file, hash] of Object.entries(entry.evidence_sha256)) {
        if (!/^(src\/|docs\/(1-product|2-architecture)\/)/.test(file) || file.includes('..') || sha(fs.readFileSync(file, 'utf8')) !== hash) throw new Error(`Changed evidence: ${entry.id} / ${file}`)
    }
    if (entry.id.startsWith('tasks-portal.') && sha(fs.readFileSync(`${root}/drafts/articles/${entry.id}.md`, 'utf8')) !== entry.draft_sha256) throw new Error(`Changed portal draft: ${entry.id}`)
}
for (const [source, target] of copies) {
    let text = fs.readFileSync(source, 'utf8')
    if (target.endsWith('/tasks.manage-tasks.md')) {
        // Index vocabulary only: the reviewed body already documents group deletion in List.
        text = text.replace('keywords:', 'keywords:\n  - eliminar tareas en grupo\n  - elimino\n  - varias tareas\n  - lista')
        const entry = snapshot.articles.find(article => article.id === 'tasks.manage-tasks')
        entry.draft_sha256 = sha(text)
        entry.reviewed_by = 'Gemini (editorial); Codex (bulk-action search vocabulary)'
    }
    fs.writeFileSync(target, text)
}
fs.writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Merged 26 dashboard + 22 portal guides. Preserved latest baseline history review. Snapshot: ${output}`)
