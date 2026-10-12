import type { HelpAccess, HelpArticle } from './schema'

const stopWords = new Set(['como', 'para', 'puedo', 'quiero', 'donde', 'tengo', 'esta', 'este', 'hacer', 'desde', 'porque', 'con', 'por', 'una', 'que', 'los', 'las', 'del', 'el', 'la', 'de', 'en', 'un', 'me', 'se', 'y', 'si', 'movil', 'aparece', 'funciona', 'entonces', 'eso', 'esto'])
export function terms(text: string): string[] {
    return [...new Set(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .match(/[a-z0-9]+/g)?.filter(word => word.length > 1 && !stopWords.has(word)) ?? [])].slice(0, 32)
}
export function canReadArticle(article: HelpArticle, access: HelpAccess): boolean {
    if (article.audience === 'platform-admin' && !access.platformAdmin) return false
    if (article.audience === 'tenant-admin' && !access.tenantAdmin && !access.platformAdmin) return false
    if (article.verticals.length && !article.verticals.includes(access.vertical)) return false
    if (!article.required_modules.every(module => access.modules.includes('all') || access.modules.includes(module))) return false
    return article.required_permissions.every(permission => access.permissions.includes(permission))
}

export function retrieveHelp(articles: HelpArticle[], question: string, access: HelpAccess, priorQuestion = ''): HelpArticle[] {
    const current = terms(question)
    // Context augments short follow-ups, but cannot make an entirely unrelated document relevant.
    const followUp = current.length <= 2 && /\b(eso|esto|entonces|también|tambien|aparece|funciona|móvil|movil)\b/i.test(question)
    const query = [...new Set([...current, ...(followUp ? terms(priorQuestion) : [])])]
    if (!query.length) return []
    const ranked = articles.filter(article => canReadArticle(article, access)).map(article => {
        const title = new Set(terms(`${article.title} ${article.keywords.join(' ')}`))
        const body = new Set(terms(article.content))
        // Full body tokenization (terms has a query cap).
        article.content.split(/\n/).forEach(line => terms(line).forEach(term => body.add(term)))
        const matches = query.filter(term => title.has(term) || body.has(term))
        if (!matches.length) return { article, score: 0 }
        const overlap = matches.length / query.length
        if (overlap < 0.4) return { article, score: 0 }
        const score = matches.reduce((sum, term) => sum + (title.has(term) ? 4 : 1), 0)
            + (access.route && article.routes.includes(access.route) ? 1 : 0)
        return { article, score }
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    // Bound retrieved context independently of corpus size. This score is relevance, not confidence.
    const selected: HelpArticle[] = []
    let characters = 0
    for (const { article } of ranked.slice(0, 5)) {
        if (characters + article.content.length > 16000) continue
        selected.push(article); characters += article.content.length
    }
    return selected
}

export function boundedHistory<T extends { role: 'user' | 'assistant'; content: string }>(messages: T[], maxCharacters = 10000): T[] {
    const selected: T[] = []
    let total = 0
    for (const message of messages.slice(-12).reverse()) {
        if (message.content.length + total > maxCharacters) break
        selected.unshift(message); total += message.content.length
    }
    // Google chat history must start with a user; do not keep an orphaned answer after budgeting.
    while (selected.length && selected[0].role !== 'user') selected.shift()
    return selected
}
