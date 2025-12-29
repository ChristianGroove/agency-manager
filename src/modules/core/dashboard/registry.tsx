
'use client'

import React from 'react'

// Type definition for a Widget Component
export type WidgetComponent = React.ComponentType<any>

// The registry map
const WIDGET_REGISTRY: Record<string, WidgetComponent> = {}

export const DashboardRegistry = {
    // Register a new widget
    register: (key: string, component: WidgetComponent) => {
        if (WIDGET_REGISTRY[key]) {
            console.warn(`Widget registry: Overwriting widget key "${key}"`)
        }
        WIDGET_REGISTRY[key] = component
    },

    // Bulk register
    registerMany: (widgets: Record<string, WidgetComponent>) => {
        Object.entries(widgets).forEach(([key, component]) => {
            WIDGET_REGISTRY[key] = component
        })
    },

    // Get a widget by key
    get: (key: string): WidgetComponent | null => {
        return WIDGET_REGISTRY[key] || null
    },

    // Debug: Get all keys
    getAllKeys: () => Object.keys(WIDGET_REGISTRY)
}
