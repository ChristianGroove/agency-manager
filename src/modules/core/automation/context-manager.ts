/**
 * Context Manager
 * Handles variable resolution and context state for workflow execution
 */

export interface WorkflowContext {
    [key: string]: unknown
}

export class ContextManager {
    private context: WorkflowContext

    constructor(initialContext: WorkflowContext = {}) {
        this.context = initialContext
    }

    /**
     * Resolves {{variable}} syntax in strings
     */
    resolve(text: string): string {
        if (typeof text !== 'string') return String(text)

        return text.replace(/\{\{(.+?)\}\}/g, (_, path) => {
            const keys = path.trim().split('.')
            let value: unknown = this.context

            for (const key of keys) {
                if (value && typeof value === 'object') {
                    value = (value as Record<string, unknown>)[key]
                } else {
                    value = undefined
                    break
                }
            }

            return value !== undefined ? String(value) : ''
        })
    }

    /**
     * Get a value from context (supports dot-notation like 'conversation.id')
     */
    get(path: string): unknown {
        // Support dot-notation for nested values
        const keys = path.split('.')
        let value: unknown = this.context

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = (value as Record<string, unknown>)[key]
            } else {
                return undefined
            }
        }

        return value
    }

    /**
     * Set a value in context
     */
    set(key: string, value: unknown): void {
        this.context[key] = value
    }

    /**
     * Get entire context
     */
    getAll(): WorkflowContext {
        return { ...this.context }
    }
}
