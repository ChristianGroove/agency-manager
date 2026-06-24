import React, { memo } from 'react'
import { NodeProps, NodeResizer } from '@xyflow/react'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface WallNodeData extends Record<string, unknown> {
    orientation?: 'horizontal' | 'vertical'
    color?: string
    label?: string
    isBuilder?: boolean
}

const WallNode = ({ data, selected }: NodeProps) => {
    const d = data as WallNodeData
    const color = d.color || '#78716c'

    return (
        <div className="relative w-full h-full">
            <div
                className={cn(
                    'w-full h-full rounded-sm transition-all duration-150',
                    selected && 'ring-2 ring-offset-1 ring-blue-500'
                )}
                style={{ backgroundColor: color, opacity: 0.85 }}
            >
                {d.label && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80 truncate px-1">
                        {d.label}
                    </span>
                )}
            </div>

            {d.isBuilder && (
                <NodeResizer
                    minWidth={20}
                    minHeight={10}
                    isVisible={selected}
                    lineClassName="border-blue-500"
                    handleClassName="bg-blue-500 border-white rounded-sm"
                />
            )}
        </div>
    )
}

export default memo(WallNode)
