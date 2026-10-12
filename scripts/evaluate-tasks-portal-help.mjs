// Offline retrieval/access check. Does not evaluate factual accuracy or call a provider.
import fs from 'node:fs'
import * as RetrievalModule from '../src/modules/features/caa/library/retrieval.ts'
import * as SchemaModule from '../src/modules/features/caa/library/schema.ts'
const { retrieveHelp, canReadArticle } = RetrievalModule.default || RetrievalModule
const { corpusSchema } = SchemaModule.default || SchemaModule
const corpus = corpusSchema.parse(JSON.parse(fs.readFileSync('src/modules/features/caa/library/published.json', 'utf8')))
const cases = JSON.parse(fs.readFileSync('docs/1-product/help-library/portal-preparation/tasks/questions.json', 'utf8')).cases
const profiles = { all_collaborators: ['collaborator'], developer: ['collaborator'], designer: ['collaborator'], specialist: ['collaborator'], standard_collaborator: ['collaborator'], pm_lead: ['lead'], qa_specialist: ['qa'], qa_lead: ['qa'], parallel_support: ['support'] }
const capabilities = { developer: ['vcs_code', 'monitoring'], designer: ['design_preview'], qa_lead: ['vcs_code', 'design_preview', 'monitoring'], qa_specialist: ['vcs_code', 'design_preview', 'monitoring'], pm_lead: ['bulk_delete', 'vcs_code', 'design_preview', 'monitoring', 'finance_costs'] }
const results = cases.map(item => {
    if (!profiles[item.profile]) throw new Error(`Unmapped test profile: ${item.profile}`)
    const access = { surface: 'portal.tasks', portalProfiles: profiles[item.profile], portalCapabilities: capabilities[item.profile] || [], modules: ['module_tasks'], permissions: [], platformAdmin: false, tenantAdmin: false, vertical: 'agency', route: '/portal/tasks/[token]' }
    const authorized = corpus.articles.filter(article => canReadArticle(article, access))
    const retrieved = retrieveHelp(corpus.articles, item.query, access).map(article => article.id)
    const readableExpected = item.expected_guides.filter(id => authorized.some(article => article.id === id))
    const status = item.expected_behavior === 'answer' && !item.expected_guides.length ? 'requires_local_policy_check'
        : item.expected_behavior !== 'answer' ? 'requires_model_or_manual_boundary_check'
        : !readableExpected.length ? 'capability_or_profile_blocked' : retrieved.some(id => readableExpected.includes(id)) ? 'retrieval_hit' : 'retrieval_miss'
    return { id: item.id, profile: item.profile, expected_behavior: item.expected_behavior, expected_guides: item.expected_guides, readable_expected: readableExpected, retrieved, status }
})
const answerCases = results.filter(item => item.expected_behavior === 'answer')
const report = { corpus_revision: corpus.revision, portal_articles: corpus.articles.filter(article => article.surface === 'portal.tasks').length, total_cases: results.length,
    answer_cases: answerCases.length, retrieval_hits: answerCases.filter(item => item.status === 'retrieval_hit').length,
    retrieval_misses: answerCases.filter(item => item.status === 'retrieval_miss').length, access_blocked: answerCases.filter(item => item.status === 'capability_or_profile_blocked').length,
    local_policy_cases: answerCases.filter(item => item.status === 'requires_local_policy_check').length,
    clarify_cases: results.filter(item => item.expected_behavior === 'clarify').length, abstain_cases: results.filter(item => item.expected_behavior === 'abstain').length,
    note: 'Synthetic role-default fixtures. Access-blocked guides remain excluded. Clarify/abstain need model or manual verification; retrieval hits do not prove factual correctness. No provider calls.', cases: results }
const output = 'docs/1-product/help-library/reviews/tasks-portal-retrieval-report.json'
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ ...report, cases: undefined }))
if (report.retrieval_misses) process.exitCode = 1
