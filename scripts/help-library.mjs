import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import yaml from 'js-yaml'
import { z } from 'zod'
import * as SchemaModule from '../src/modules/features/caa/library/schema.ts'
const { draftSchema, reviewSchema, corpusSchema } = SchemaModule.default || SchemaModule

const root = fs.realpathSync(process.cwd())
const draftRoot = path.join(root, 'docs/1-product/help-library/drafts/articles')
const sha = text => crypto.createHash('sha256').update(text).digest('hex')
function safeRead(relative) {
    if (path.isAbsolute(relative) || relative.includes('..') || !/^(src\/|docs\/(1-product|2-architecture)\/)/.test(relative)) throw new Error(`Ruta no permitida: ${relative}`)
    const resolved = fs.realpathSync(path.join(root, relative))
    if (!resolved.startsWith(root + path.sep) || resolved.includes(`${path.sep}drafts${path.sep}`)) throw new Error('Evidencia fuera del checkout o circular')
    if (fs.statSync(resolved).size > 2000000) throw new Error('Evidencia demasiado grande')
    return fs.readFileSync(resolved, 'utf8')
}
function parseDraft(filename) {
    const raw = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')
    if (raw.length > 24000) throw new Error('Artículo demasiado grande')
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/)
    if (!match) throw new Error('Frontmatter ausente')
    if (/[&*!]/.test(match[1])) throw new Error('Tags y referencias YAML no permitidos')
    const meta = draftSchema.parse(yaml.load(match[1], { schema: yaml.JSON_SCHEMA }))
    const content = match[2].split(/^#{1,6}\s+Notas de verificaci[oó]n\s*$/mi)[0].trim()
    if (content.length < 100 || content.length > 16000 || /<\/?[a-z][^>]*>|!\[|(?:https?:\/\/|file:\/\/|javascript:)/i.test(content)) throw new Error('Contenido vacío, excesivo o enlaces/HTML sin control')
    for (const evidence of meta.evidence) {
        if (!safeRead(evidence.path).includes(evidence.symbol)) throw new Error(`Símbolo no encontrado: ${evidence.path} / ${evidence.symbol}`)
    }
    for (const route of meta.routes) {
        const parts = route.slice(1).split('/').filter(Boolean)
        let directories = [path.join(root, 'src/app/(dashboard)')]
        for (const part of parts) directories = directories.flatMap(dir => fs.existsSync(path.join(dir, part)) ? [path.join(dir, part)] : [])
        if (!directories.some(dir => fs.existsSync(path.join(dir, 'page.tsx')) || fs.existsSync(path.join(dir, 'page.ts')))) throw new Error(`Ruta sin página comprobable: ${route}`)
    }
    return { meta, content, hash: sha(raw) }
}
const command = process.argv[2]
try {
    if (!['validate', 'publish'].includes(command)) throw new Error('Uso: npm run help:validate | npm run help:publish -- <review.json>')
    const files = fs.existsSync(draftRoot) ? fs.readdirSync(draftRoot).filter(f => f.endsWith('.md')).sort() : []
    const errors = []
    const drafts = files.map(file => {
        const candidate = path.join(draftRoot, file)
        if (fs.lstatSync(candidate).isSymbolicLink() || !fs.realpathSync(candidate).startsWith(root + path.sep)) throw new Error('No se permiten artículos enlazados o fuera del checkout')
        try { return parseDraft(candidate) } catch (error) { errors.push(`${file}: ${error.message}`); return null }
    }).filter(Boolean)
    if (errors.length) throw new Error(errors.join('\n'))
    if (new Set(drafts.map(d => d.meta.id)).size !== drafts.length) throw new Error('IDs duplicados')
    const articleIds = new Set(drafts.map(draft => draft.meta.id))
    const draftFolder = path.dirname(draftRoot)
    const inventoryPath = path.join(draftFolder, 'inventory.json')
    if (fs.existsSync(inventoryPath)) {
        const inventory = z.object({ schema_version: z.literal(1), source_revision: z.string().regex(/^[a-f0-9]{7,40}$/), modules: z.array(z.object({
            id: z.string(), name: z.string(), implementation_status: z.enum(['implemented', 'partial', 'planned', 'retired', 'unknown']),
            routes: z.array(z.string()), evidence_paths: z.array(z.string()), article_ids: z.array(z.string()), gaps: z.array(z.string()), manual_checks_pending: z.array(z.string()),
        })) }).parse(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')))
        if (new Set(inventory.modules.map(module => module.id)).size !== inventory.modules.length) throw new Error('Módulos duplicados en inventario')
        for (const module of inventory.modules) {
            for (const id of module.article_ids) if (!articleIds.has(id)) throw new Error(`Artículo inexistente en inventario: ${id}`)
            for (const evidence of module.evidence_paths) safeRead(evidence)
        }
    }
    const questionsPath = path.join(draftFolder, 'questions.json')
    if (fs.existsSync(questionsPath)) {
        const questions = z.object({ schema_version: z.literal(1), source_revision: z.string().regex(/^[a-f0-9]{7,40}$/), questions: z.array(z.object({
            id: z.string().min(1), question: z.string().min(3).max(500), audience: z.enum(['tenant-user', 'tenant-admin', 'platform-admin']),
            view_id: z.string().optional(), expected_article_ids: z.array(z.string()), expected_points: z.array(z.string()), must_not_claim: z.array(z.string()),
            expected_behavior: z.enum(['answer', 'clarify', 'abstain']),
        })).min(50).max(100) }).parse(JSON.parse(fs.readFileSync(questionsPath, 'utf8'))).questions
        if (new Set(questions.map(question => question.id)).size !== questions.length) throw new Error('Preguntas duplicadas')
        for (const question of questions) {
            for (const id of question.expected_article_ids) if (!articleIds.has(id)) throw new Error(`Pregunta ${question.id} referencia artículo inexistente: ${id}`)
            if (question.expected_behavior === 'answer' && !question.expected_article_ids.length) throw new Error(`Pregunta sin fuente esperada: ${question.id}`)
        }
        console.log(`Preguntas con referencias válidas: ${questions.length}. Evaluación semántica pendiente.`)
    }
    console.log(`Artículos estructuralmente válidos: ${drafts.length}. Esto no certifica sus procedimientos.`)
    if (command === 'publish') {
        if (!process.argv[3]) throw new Error('Se requiere revisión explícita con hashes y permisos')
        const review = reviewSchema.parse(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')))
        if (new Set(review.articles.map(a => a.id)).size !== review.articles.length) throw new Error('Revisión con IDs duplicados')
        const articles = review.articles.map(approval => {
            const draft = drafts.find(d => d.meta.id === approval.id)
            if (!draft || draft.hash !== approval.draft_sha256) throw new Error(`Borrador modificado/no encontrado: ${approval.id}`)
            for (const evidence of draft.meta.evidence) {
                if (approval.evidence_sha256[evidence.path] !== sha(safeRead(evidence.path))) throw new Error(`Evidencia no revisada o modificada: ${evidence.path}`)
            }
            if (approval.link_route && (!draft.meta.routes.includes(approval.link_route) || approval.link_route.includes('['))) throw new Error('Enlace no revisado o dinámico')
            const { id, title, module, audience, routes, keywords } = draft.meta
            return { id, title, module, audience, routes, keywords, content: draft.content,
                required_modules: approval.required_modules, required_permissions: approval.required_permissions,
                verticals: approval.verticals, link_route: approval.link_route, revision: draft.hash }
        })
        const corpus = corpusSchema.parse({ schema_version: 1, revision: sha(JSON.stringify(articles)), articles })
        const output = path.join(root, 'src/modules/features/caa/library/published.json')
        fs.writeFileSync(output + '.tmp', JSON.stringify(corpus, null, 2) + '\n')
        fs.renameSync(output + '.tmp', output)
        console.log(`Biblioteca publicada: ${articles.length} artículos; revisión ${corpus.revision}. Requiere nuevo build.`)
    }
} catch (error) { console.error(error.message); process.exitCode = 1 }
