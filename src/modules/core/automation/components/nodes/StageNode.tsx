"use client"

import { Handle, Position } from '@xyflow/react'
import { ArrowRightCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StageNodeProps {
    data: {
        status?: string
    }
    selected?: boolean
}

export function StageNode({ data, selected }: StageNodeProps) {
    return (
        <div className={cn(
            "min-w-[180px] rounded-xl border-2 shadow-sm transition-all bg-white border-blue-200",
            selected && "ring-2 ring-offset-2 ring-violet-500 shadow-md scale-105"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-white bg-blue-500">
                <div className="p-1 bg-white/20 rounded">
                    <ArrowRightCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide flex-1">
                    CAMBIAR ETAPA
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="flex items-center gap-2 justify-center">
                    <span className="text-[10px] text-gray-400">Mover a</span>
                    <ArrowRight className="h-3 w-3 text-blue-400" />
                </div>

                <div className="mt-1 text-xs border border-blue-100 bg-blue-50 text-blue-700 rounded px-2 py-1.5 text-center font-medium truncate">
                    {data.status ? data.status.toUpperCase() : "Sin etapa definida"}
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !border-2 !border-white !bg-blue-500"
            />
        </div>
    )
}

export default StageNode
