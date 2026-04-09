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
            // console.warn(`[CAA] Action ${action.id} already registered.`)
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

/**
 * HelpRegistry - DEPRECATED for local storage.
 * Content is now resolved via AI or Vector Search on-demand.
 */
class HelpRegistry {
    private static instance: HelpRegistry
    public static getInstance(): HelpRegistry {
        if (!HelpRegistry.instance) HelpRegistry.instance = new HelpRegistry()
        return HelpRegistry.instance
    }
    register(..._args: any[]) { }
    batchRegister(..._args: any[]) { }
    getAll(): any[] { return [] }
    getByView(): any[] { return [] }
}

export const actionRegistry = ActionRegistry.getInstance()
export const helpRegistry = HelpRegistry.getInstance()
