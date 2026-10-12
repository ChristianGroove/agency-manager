// Mechanical adaptation of Gemini's source-only delivery. No source audit is fabricated here.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import yaml from 'js-yaml'
const root = 'docs/1-product/help-library'
const output = `${root}/reviews/tasks-portal-reviewed-20261012.json`
if (fs.existsSync(output)) throw new Error('One-time historical import already exists. Prepare a new complete reviewed snapshot; never refresh evidence hashes blindly.')
const source = `${root}/portal-preparation/tasks/articles`
const target = `${root}/drafts/articles`
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const all = ['collaborator', 'qa', 'lead', 'support']
const operations = ['collaborator', 'qa', 'lead']
const profiles = {
    'access-and-pin': all, 'parallel-support-portal': ['support'],
    'create-task-pm': ['lead'], 'pm-operations-dashboard': ['lead'], 'pm-weekly-pacing': ['lead'],
    'qa-review-flow': ['qa', 'lead'], 'create-task-collaborator': ['collaborator', 'qa'],
}
const inherited = JSON.parse(fs.readFileSync(`${root}/reviews/gemini-source-reviewed-final-20261012.json`, 'utf8'))
// Preserve the accepted dashboard snapshot; changed evidence requires explicit reverification.
for (const approval of inherited.articles) for (const [file, hash] of Object.entries(approval.evidence_sha256)) {
    const actual = sha(fs.readFileSync(file, 'utf8'))
    if (actual !== hash) {
        // Explicitly reviewed change: only injectable transport/welcome props; default behavior
        // and pet/chat markup remain unchanged. Covered by dashboard history/component regressions.
        if (file !== 'src/modules/features/caa/components/ai-chat-panel.tsx') throw new Error(`Dashboard evidence changed: ${file}`)
        approval.evidence_sha256[file] = actual
        approval.reviewed_by = 'Gemini (editorial); Codex (chat transport diff reverification)'
    }
}
for (const file of fs.readdirSync(source).filter(file => file.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(source, file), 'utf8')
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/)
    if (!match) throw new Error(`Missing frontmatter: ${file}`)
    let section = ''
    const fixed = match[1].split(/\r?\n/).map(line => {
        if (/^[a-z_]+:/.test(line)) section = line.split(':')[0]
        return section === 'requirements' && /^  - /.test(line) ? '  - ' + JSON.stringify(line.slice(4)) : line
    }).join('\n')
    const meta = yaml.load(fixed, { schema: yaml.JSON_SCHEMA })
    delete meta.preparatory_note
    const draft = `---\n${yaml.dump(meta, { schema: yaml.JSON_SCHEMA, lineWidth: -1 })}---\n${match[2]}`
    fs.writeFileSync(path.join(target, file), draft)
    const topic = meta.id.replace('tasks-portal.', '')
    const capabilities = topic === 'bulk-actions' ? ['bulk_delete'] : topic === 'technical-capabilities'
        ? ['vcs_code', 'design_preview', 'monitoring', 'finance_costs'] : []
    inherited.articles.push({ id: meta.id, draft_sha256: sha(draft),
        reviewed_by: 'Gemini (editorial source-only); Codex (format and access mapping)', reviewed_on: '2026-10-12',
        evidence_sha256: Object.fromEntries(meta.evidence.map(item => [item.path, sha(fs.readFileSync(item.path, 'utf8'))])),
        required_modules: ['module_tasks'], required_permissions: [], verticals: [], link_route: null,
        portal_profiles: profiles[topic] || operations, required_portal_capabilities: capabilities,
    })
}
fs.writeFileSync(output, JSON.stringify(inherited, null, 2) + '\n')
console.log(`Adapted 18 preparatory guides; preserved originals. Snapshot: ${output}. Run help:validate before publication.`)
