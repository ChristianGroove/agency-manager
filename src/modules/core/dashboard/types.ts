
export interface WidgetDefinition {
    id: string
    name: string
    description?: string
    defaultProps?: Record<string, any>
}

export interface DashboardWidgetConfig {
    widget: string // The key used in the registry
    span?: number // Column span (default 1)
    props?: Record<string, any> // Instance-specific props
    title?: string // Optional override title
}

export interface DashboardRow {
    columns: DashboardWidgetConfig[]
    height?: string // Optional row height definition
}

export interface DashboardLayout {
    id: string
    name: string
    description?: string
    rows: DashboardRow[]
}

// Configuration map for vertical-specific dashboards
export type VerticalDashboardConfig = Record<string, DashboardLayout>
