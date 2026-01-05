"use client"

import { Handle, Position } from '@xyflow/react'
import { Tag, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagNodeProps {
    data: {
        action?: 'add' | 'remove'
        tagName?: string
    }
    selected?: boolean
}

export function TagNode({ data, selected }: TagNodeProps) {
    const action = data.action || 'add'
    const isAdd = action === 'add'

    return (
        <div className={cn(
            "min-w-[180px] rounded-xl border-2 shadow-sm transition-all bg-white",
            isAdd ? "border-amber-200" : "border-red-200",
            selected && "ring-2 ring-offset-2 ring-violet-500 shadow-md scale-105"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
            />

            {/* Header */}
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-t-lg text-white",
                isAdd ? "bg-amber-500" : "bg-red-500"
            )}>
                <div className="p-1 bg-white/20 rounded">
                    <Tag className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide flex-1">
                    {isAdd ? 'AÑADIR ETIQUETA' : 'QUITAR ETIQUETA'}
                </span>
                {isAdd ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </div>

            {/* Content */}
            <div className="p-3">
                <div className={cn(
                    "text-xs border rounded px-2 py-1.5 text-center font-medium truncate",
                    isAdd ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
                )}>
                    {data.tagName || "Sin etiqueta"}
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className={cn(
                    "!w-3 !h-3 !border-2 !border-white",
                    isAdd ? "!bg-amber-500" : "!bg-red-500"
                )}
            />
        </div>
    )
}

export default TagNode
