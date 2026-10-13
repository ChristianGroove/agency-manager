import { describe, expect, it } from 'vitest'
import { selectAuthorizedArticles } from './selection'
import type { HelpArticle } from './schema'
const article = { id: 'inbox.notes', content: 'Verified guide.' } as HelpArticle
describe('model-assisted guide selection', () => {
    it('ignores unauthorized and invented IDs and deduplicates approved results', () => {
        expect(selectAuthorizedArticles({ articleIds: ['platform.private', 'inbox.notes', 'inbox.notes'] }, [article])).toEqual([article])
    })
    it('rejects malformed selections and bounds context', () => {
        expect(selectAuthorizedArticles({ articleIds: 'all' }, [article])).toEqual([])
        const large = { ...article, content: 'x'.repeat(16001) }
        expect(selectAuthorizedArticles({ articleIds: [article.id] }, [large])).toEqual([])
    })
})
