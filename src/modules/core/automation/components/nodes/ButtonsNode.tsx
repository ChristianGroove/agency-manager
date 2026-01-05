"use client"

import { Handle, Position } from '@xyflow/react'
import { MessageSquare, ListOrdered, Link, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonConfig {
    id: string
    title: string
}

interface ButtonsNodeProps {
    data: {
        label?: string
        messageType?: 'buttons' | 'list' | 'cta'
        body?: string
        buttons?: ButtonConfig[]
        listButtonText?: string
        sections?: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>
        waitForResponse?: boolean
    }
    selected?: boolean
}

const TYPE_CONFIG = {
    buttons: {
        icon: MessageSquare,
        label: 'Botones',
        color: 'from-violet-500 to-purple-600',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200'
    },
    list: {
        icon: ListOrdered,
        label: 'Lista',
        color: 'from-indigo-500 to-blue-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
    },
    cta: {
        icon: Link,
        label: 'CTA',
        color: 'from-emerald-500 to-teal-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
    }
}

export function ButtonsNode({ data, selected }: ButtonsNodeProps) {
    const messageType = data.messageType || 'buttons'
    const config = TYPE_CONFIG[messageType]
    const Icon = config.icon

    const buttonCount = data.buttons?.length || 0
    const rowCount = data.sections?.reduce((acc, s) => acc + s.rows.length, 0) || 0

    return (
        <div className={cn(
            "min-w-[200px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all",
            config.bgColor,
            config.borderColor,
            selected && "ring-2 ring-offset-2 ring-violet-500 shadow-xl scale-105"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
            />

            {/* Header */}
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r text-white",
                config.color
            )}>
                <div className="p-1 bg-white/20 rounded">
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    {config.label.toUpperCase()}
                </span>
                {data.waitForResponse && (
                    <span className="ml-auto text-[10px] bg-white/30 px-1.5 py-0.5 rounded">
                        ⏳ Espera
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                {/* Message Preview */}
                {data.body && (
                    <p className="text-xs text-gray-700 line-clamp-2 bg-white/60 p-2 rounded border">
                        {data.body}
                    </p>
                )}

                {/* Buttons Preview */}
                {messageType === 'buttons' && data.buttons && data.buttons.length > 0 && (
                    <div className="space-y-1">
                        {data.buttons.map((btn, i) => (
                            <div
                                key={btn.id || i}
                                className="relative text-xs bg-white border rounded px-2 py-1.5 text-center font-medium text-violet-700 group"
                            >
                                {btn.title || `Botón ${i + 1}`}

                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={btn.id}
                                    className="!w-2.5 !h-2.5 !bg-violet-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-violet-600"
                                    style={{ right: '-19px', top: '50%', transform: 'translateY(-50%)' }}
                                    title={`Opción: ${btn.title}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* List Preview */}
                {messageType === 'list' && (
                    <div className="text-center">
                        <div className="text-xs bg-indigo-100 border border-indigo-200 rounded px-3 py-1.5 inline-flex items-center gap-1 font-medium text-indigo-700">
                            <ListOrdered className="h-3 w-3" />
                            {data.listButtonText || 'Ver opciones'}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {rowCount} {rowCount === 1 ? 'opción' : 'opciones'}
                        </p>
                    </div>
                )}

                {/* CTA Preview */}
                {messageType === 'cta' && (
                    <div className="text-center">
                        <div className="text-xs bg-emerald-100 border border-emerald-200 rounded px-3 py-1.5 inline-flex items-center gap-1 font-medium text-emerald-700">
                            <Link className="h-3 w-3" />
                            Ver más
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!data.body && buttonCount === 0 && rowCount === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                        Configura el mensaje interactivo
                    </p>
                )}
            </div>

            {/* Fallback/Continue Handle */}
            <div className="absolute bottom-3 -right-3">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="continue"
                    className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white hover:!bg-slate-400"
                    style={{ position: 'static', transform: 'none' }}
                    title="Continuar / Timeout"
                />
            </div>

        </div>
    )
}

export default ButtonsNode
