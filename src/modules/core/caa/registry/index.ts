import { ActionDefinition, HelpArticle } from "../types"

class ActionRegistry {
    private static instance: ActionRegistry
    private actions: Map<string, ActionDefinition> = new Map()

    private constructor() { }

    public static getInstance(): ActionRegistry {
        if (!ActionRegistry.instance) {
            ActionRegistry.instance = new ActionRegistry()
        }
        return ActionRegistry.instance
    }

    register(action: ActionDefinition) {
        if (this.actions.has(action.id)) {
            console.warn(`[CAA] Action ${action.id} already registered. Overwriting.`)
        }
        this.actions.set(action.id, action)
    }

    batchRegister(actions: ActionDefinition[]) {
        actions.forEach(a => this.register(a))
    }

    getAll(): ActionDefinition[] {
        return Array.from(this.actions.values())
    }

    get(id: string): ActionDefinition | undefined {
        return this.actions.get(id)
    }
}

class HelpRegistry {
    private static instance: HelpRegistry
    private articles: Map<string, HelpArticle> = new Map()

    private constructor() { }

    public static getInstance(): HelpRegistry {
        if (!HelpRegistry.instance) {
            HelpRegistry.instance = new HelpRegistry()
        }
        return HelpRegistry.instance
    }

    register(article: HelpArticle) {
        this.articles.set(article.id, article)
    }

    batchRegister(articles: HelpArticle[]) {
        articles.forEach(a => this.register(a))
    }

    getAll(): HelpArticle[] {
        return Array.from(this.articles.values())
    }

    getByView(viewId: string): HelpArticle[] {
        return this.getAll().filter(article =>
            article.relatedViews.includes(viewId) || article.relatedViews.includes('*')
        )
    }
}

export const actionRegistry = ActionRegistry.getInstance()
export const helpRegistry = HelpRegistry.getInstance()
