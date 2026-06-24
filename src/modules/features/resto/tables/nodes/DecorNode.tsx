import React, { memo } from 'react'
import { NodeProps, NodeResizer } from '@xyflow/react'
import { cn } from '@/modules/infrastructure/utils/utils'

export type DecorType = 'plant' | 'bar' | 'window' | 'door' | 'stairs' | 'label' | 'reception' | 'restroom' | 'kitchen'

export interface DecorNodeData extends Record<string, unknown> {
    decorType: DecorType
    label?: string
    color?: string
    isBuilder?: boolean
}

const DECOR_CONFIG: Record<DecorType, { emoji: string; bg: string; border: string; defaultLabel: string }> = {
    plant: {
        emoji: '🌿',
        bg: 'bg-green-100 dark:bg-green-950/50',
        border: 'border-green-300 dark:border-green-700',
        defaultLabel: 'Planta'
    },
    bar: {
        emoji: '🍺',
        bg: 'bg-amber-100 dark:bg-amber-950/50',
        border: 'border-amber-300 dark:border-amber-700',
        defaultLabel: 'Barra'
    },
    window: {
        emoji: '🪟',
        bg: 'bg-sky-100 dark:bg-sky-950/50',
        border: 'border-sky-300 dark:border-sky-700',
        defaultLabel: 'Ventana'
    },
    door: {
        emoji: '🚪',
        bg: 'bg-orange-100 dark:bg-orange-950/50',
        border: 'border-orange-300 dark:border-orange-700',
        defaultLabel: 'Puerta'
    },
    stairs: {
        emoji: '🪜',
        bg: 'bg-zinc-100 dark:bg-zinc-800/50',
        border: 'border-zinc-300 dark:border-zinc-600',
        defaultLabel: 'Escaleras'
    },
    label: {
        emoji: '🏷️',
        bg: 'bg-transparent',
        border: 'border-dashed border-zinc-300 dark:border-zinc-600',
        defaultLabel: 'Zona'
    },
    reception: {
        emoji: '🛎️',
        bg: 'bg-rose-100 dark:bg-rose-950/50',
        border: 'border-rose-300 dark:border-rose-700',
        defaultLabel: 'Recepción'
    },
    restroom: {
        emoji: '🚻',
        bg: 'bg-blue-100 dark:bg-blue-950/50',
        border: 'border-blue-300 dark:border-blue-700',
        defaultLabel: 'Baños'
    },
    kitchen: {
        emoji: '👨‍🍳',
        bg: 'bg-yellow-100 dark:bg-yellow-950/50',
        border: 'border-yellow-300 dark:border-yellow-700',
        defaultLabel: 'Cocina'
    }
}

const DecorNode = ({ data, selected }: NodeProps) => {
    const d = data as DecorNodeData
    const config = DECOR_CONFIG[d.decorType] || DECOR_CONFIG.plant
    const isLabel = d.decorType === 'label'

    return (
        <div className="relative w-full h-full">
            <div
                className={cn(
                    'w-full h-full flex flex-col items-center justify-center gap-0.5',
                    'border-2 rounded-xl transition-all duration-150',
                    config.bg,
                    config.border,
                    selected && 'ring-2 ring-offset-1 ring-blue-500',
                    isLabel && 'rounded-none'
                )}
            >
                {!isLabel && (
                    <span className="text-lg leading-none">{config.emoji}</span>
                )}
                <span className={cn(
                    'text-[10px] font-semibold text-center leading-tight px-1',
                    isLabel ? 'text-sm font-bold text-zinc-600 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-300'
                )}>
                    {d.label || config.defaultLabel}
                </span>
            </div>

            {d.isBuilder && (
                <NodeResizer
                    minWidth={40}
                    minHeight={40}
                    isVisible={selected}
                    lineClassName="border-blue-500"
                    handleClassName="bg-blue-500 border-white rounded-sm"
                />
            )}
        </div>
    )
}

export default memo(DecorNode)
