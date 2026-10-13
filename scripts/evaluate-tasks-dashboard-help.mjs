// Offline retrieval and access-boundary checks; no model or browser calls.
import fs from 'node:fs'
import * as RetrievalModule from '../src/modules/features/caa/library/retrieval.ts'
import * as SchemaModule from '../src/modules/features/caa/library/schema.ts'
const { retrieveHelp, canReadArticle } = RetrievalModule.default || RetrievalModule
const { corpusSchema, knownPermissions } = SchemaModule.default || SchemaModule
const corpus = corpusSchema.parse(JSON.parse(fs.readFileSync('src/modules/features/caa/library/published.json', 'utf8')))
const questions = JSON.parse(fs.readFileSync('docs/1-product/help-library/dashboard-preparation/tasks/questions.json', 'utf8')).questions
const access = { surface: 'dashboard', platformAdmin: false, tenantAdmin: false, modules: ['module_tasks'], permissions: knownPermissions, vertical: 'agency', route: '/operations/tasks' }
const cases = questions.map(question => {
    const ids = retrieveHelp(corpus.articles, question.question, access).map(article => article.id)
    if (question.expected_article_ids.some(id => !corpus.articles.some(article => article.id === id && article.surface !== 'portal.tasks'))) throw new Error(`Invalid dashboard expectation: ${question.id}`)
    return { id: question.id, expected_behavior: question.expected_behavior, expected_article_ids: question.expected_article_ids, retrieved: ids,
        status: question.expected_behavior !== 'answer' ? 'requires_model_or_manual_boundary_check' : ids.some(id => question.expected_article_ids.includes(id)) ? 'retrieval_hit' : 'retrieval_miss' }
})
const answers = cases.filter(item => item.expected_behavior === 'answer')
const restricted = corpus.articles.filter(article => article.id.startsWith('tasks.') && article.required_permissions.includes('operations.tasks.manage'))
if (restricted.some(article => canReadArticle(article, { ...access, permissions: ['operations.tasks.view'] }))) throw new Error('Management guide leaked to view-only access')
if (corpus.articles.some(article => article.surface === 'portal.tasks' && canReadArticle(article, access))) throw new Error('Portal guide leaked to dashboard')
const report = { corpus_revision: corpus.revision, dashboard_tasks_articles: corpus.articles.filter(article => article.id.startsWith('tasks.')).length,
    total_cases: cases.length, answer_cases: answers.length, retrieval_hits: answers.filter(item => item.status === 'retrieval_hit').length,
    retrieval_misses: answers.filter(item => item.status === 'retrieval_miss').length,
    clarify_cases: cases.filter(item => item.expected_behavior === 'clarify').length, abstain_cases: cases.filter(item => item.expected_behavior === 'abstain').length,
    management_filter_checks: restricted.length,
    note: 'Retrieval uses a synthetic authorized manager. Runtime permissions, factual correctness, model answers, latency and cost require separate verification. Clarify/abstain remain separate.', cases }
fs.writeFileSync('docs/1-product/help-library/reviews/tasks-dashboard-retrieval-report.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ ...report, cases: undefined }))
if (report.retrieval_misses) process.exitCode = 1
