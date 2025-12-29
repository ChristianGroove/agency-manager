
'use client'

import React from 'react'
import { DashboardLayout } from './types'
import { DashboardRegistry } from './registry'
import { AlertCircle } from 'lucide-react'

interface DashboardEngineProps {
    layout: DashboardLayout
    className?: string
}

export function DashboardEngine({ layout, className = "" }: DashboardEngineProps) {
    if (!layout || !layout.rows) {
        return (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <div>
                    <strong className="block font-medium">Error de Configuración</strong>
                    <span className="text-sm">No se encontró una configuración válida para este dashboard.</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {layout.rows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {row.columns.map((col, colIndex) => {
                        const WidgetComponent = DashboardRegistry.get(col.widget)
                        const spanClass = col.span ? `md:col-span-${col.span}` : 'md:col-span-1'

                        if (!WidgetComponent) {
                            return (
                                <div key={`widget-error-${rowIndex}-${colIndex}`} className={`p-4 border border-dashed border-red-300 rounded bg-red-50 text-red-500 text-xs ${spanClass}`}>
                                    Widget no encontrado: "{col.widget}"
                                </div>
                            )
                        }

                        return (
                            <div key={`widget-${rowIndex}-${colIndex}`} className={spanClass}>
                                <WidgetComponent {...(col.props || {})} title={col.title} />
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
