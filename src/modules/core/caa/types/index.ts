import { LucideIcon } from "lucide-react"

// View Context Interface
export interface ViewContextState {
    viewId: string
    label: string
    actions: ActionDefinition[]
    topics: string[] // Topic IDs for help articles
}

// Action Definition Interface
export interface ActionDefinition {
    id: string
    label: string
    description?: string
    type: "route" | "modal" | "command" | "function"
    target: string // URL path, modal ID, or function identifier
    keyboardShortcut?: string
    icon?: LucideIcon
    permissions?: string[] // RBAC permissions required
    keywords?: string[] // For search indexing
}

// Help Article Interface
export interface HelpArticle {
    id: string
    title: string
    description: string
    relatedViews: string[] // Array of viewIds or glob patterns
    relatedActions: string[] // IDs of related actions
    keywords: string[]
    contentBlocks: HelpBlock[]
}

export type HelpBlock =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string; caption?: string }
    | { type: 'code'; code: string; language?: string }
    | { type: 'callout'; content: string; variant?: 'info' | 'warning' }
