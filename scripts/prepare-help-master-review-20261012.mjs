// One-time, guarded migration of a reviewed snapshot to the help-only master candidate.
// It is not an editorial reviewer or a general hash-refresh command.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const original = path.resolve(process.argv[2] || '')
const root = fs.realpathSync(process.cwd())
if (!process.argv[2] || fs.realpathSync(original) === root) throw new Error('Provide the preserved original help checkout')
const relative = 'docs/1-product/help-library/reviews/tasks-combined-reviewed-20261012.json'
const output = 'docs/1-product/help-library/reviews/tasks-master-release-reviewed-20261012.json'
if (fs.existsSync(output)) throw new Error('Historical snapshot already exists; do not overwrite')
const read = (base, file) => fs.readFileSync(path.join(base, file), 'utf8')
const sha = text => crypto.createHash('sha256').update(text).digest('hex')
const lf = text => text.replace(/\r\n/g, '\n')
const reviewed = JSON.parse(read(original, relative))
if (read(root, relative) !== read(original, relative) && lf(read(root, relative)) !== lf(read(original, relative))) {
    throw new Error('Original review snapshot differs')
}
const verified = new Map()
const transformations = {
    'src/modules/core/saas/module-config.ts': text => text
        .replace(',\n    Landmark\n', '\n')
        .replace(/    \{\n        key: 'module_cartera',\n[\s\S]*?    \},\n/, ''),
    'src/modules/core/organizations/capabilities-registry.ts': text => text
        .replace("  | 'tasks.management'\n  | 'cartera.management';", "  | 'tasks.management';")
        .replace("      'billing.management',\n      'cartera.management'", "      'billing.management'"),
}
const changedArticles = []
const articles = reviewed.articles.map(article => {
    const draftPath = `docs/1-product/help-library/drafts/articles/${article.id}.md`
    const oldDraft = read(original, draftPath)
    const newDraft = read(root, draftPath)
    if (sha(oldDraft) !== article.draft_sha256 || lf(oldDraft) !== lf(newDraft)) {
        throw new Error(`Unreviewed draft content: ${article.id}`)
    }
    let changedSource = false
    const evidence = Object.fromEntries(Object.entries(article.evidence_sha256).map(([file, expected]) => {
        const oldText = read(original, file)
        const newText = read(root, file)
        if (sha(oldText) !== expected) throw new Error(`Original evidence changed: ${file}`)
        const before = lf(oldText), after = lf(newText)
        if (before !== after) {
            const transform = transformations[file]
            if (!transform || transform(before) !== after) throw new Error(`Unreviewed substantive change: ${file}`)
            changedSource = true
            verified.set(file, 'Removal of the unrelated Cartera registration only')
        } else verified.set(file, 'Identical reviewed text after CRLF-to-LF normalization')
        return [file, sha(after)]
    }))
    if (changedSource) changedArticles.push(article.id)
    return { ...article, draft_sha256: sha(lf(newDraft)), evidence_sha256: evidence,
        ...(changedSource ? { reviewed_by: 'Gemini: editorial/fuentes; Codex: traslado acotado a master', reviewed_on: '2026-10-12' } : {}) }
})
if (changedArticles.length !== 5 || !Object.keys(transformations).every(file => verified.get(file)?.startsWith('Removal'))) {
    throw new Error('Unexpected scope of the master migration')
}
fs.writeFileSync(output, JSON.stringify({ schema_version: 1, hash_encoding: 'utf8-lf', articles }, null, 2) + '\n')
console.log(JSON.stringify({ articles: articles.length, verifiedSources: verified.size, changedArticles, output }, null, 2))
