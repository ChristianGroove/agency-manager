// Offline retrieval evaluation only. No provider calls, credentials or browser interaction.
import fs from 'node:fs'
import * as RetrievalModule from '../src/modules/features/caa/library/retrieval.ts'
import * as SchemaModule from '../src/modules/features/caa/library/schema.ts'
const { retrieveHelp } = RetrievalModule.default || RetrievalModule
const { corpusSchema, knownPermissions } = SchemaModule.default || SchemaModule
const corpus = corpusSchema.parse(JSON.parse(fs.readFileSync('src/modules/features/caa/library/published.json', 'utf8')))
const questions = JSON.parse(fs.readFileSync('docs/1-product/help-library/drafts/questions.json', 'utf8')).questions
const ids = new Set(corpus.articles.map(article => article.id))
const cases = questions.map(question => {
    const supported = question.expected_article_ids.some(id => ids.has(id))
    const access = { platformAdmin: question.audience === 'platform-admin', tenantAdmin: question.audience !== 'tenant-user', modules: ['all'], permissions: knownPermissions, vertical: 'agency', route: '/dashboard' }
    const retrieved = retrieveHelp(corpus.articles, question.question, access).map(article => article.id)
    const hit = retrieved.some(id => question.expected_article_ids.includes(id))
    return { id: question.id, expected_behavior: question.expected_behavior, published_expected: question.expected_article_ids.filter(id => ids.has(id)), retrieved,
        status: question.expected_behavior !== 'answer' ? 'boundary_requires_action_or_model_check' : !supported ? 'coverage_pending' : hit ? 'retrieval_hit' : 'retrieval_miss' }
})
const answerCases = cases.filter(item => ['retrieval_hit', 'retrieval_miss'].includes(item.status))
const report = { corpus_revision: corpus.revision, articles: corpus.articles.length, questions: cases.length,
    covered_answer_cases: answerCases.length, retrieval_hits: answerCases.filter(item => item.status === 'retrieval_hit').length,
    note: 'This checks retrieval against expected article IDs, not factual correctness, model answers, latency, cost or runtime permissions.', cases }
const output = 'docs/1-product/help-library/reviews/pilot-retrieval-report.json'
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
console.log(`Recuperación offline: ${report.retrieval_hits}/${report.covered_answer_cases} casos cubiertos; ${cases.filter(item => item.status === 'coverage_pending').length} pendientes de cobertura. Reporte: ${output}`)
if (report.retrieval_hits !== report.covered_answer_cases) process.exitCode = 1
