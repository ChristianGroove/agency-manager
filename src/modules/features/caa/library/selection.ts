import { z } from 'zod'
import type { HelpArticle } from './schema'

/** IDs returned by a model are suggestions, never authorization. */
export function selectAuthorizedArticles(result: unknown, authorized: HelpArticle[]): HelpArticle[] {
    const parsed = z.object({ articleIds: z.array(z.string()).max(3) }).strict().safeParse(result)
    if (!parsed.success) return []
    const ids = [...new Set(parsed.data.articleIds)]
    const selected: HelpArticle[] = []
    let characters = 0
    for (const id of ids) {
        const article = authorized.find(candidate => candidate.id === id)
        if (!article || characters + article.content.length > 16000) continue
        selected.push(article); characters += article.content.length
    }
    return selected
}
