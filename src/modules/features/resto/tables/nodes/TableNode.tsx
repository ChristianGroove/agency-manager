import React, { memo } from 'react'
import { NodeProps, NodeResizer } from '@xyflow/react'
import { cn } from '@/modules/infrastructure/utils/utils'
import { Users, UtensilsCrossed } from 'lucide-react'

export type TableShape = 'rectangle' | 'circle' | 'square' | 'oval'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'billing'

export interface TableNodeData extends Record<string, unknown> {
    label: string
    tableIdentifier: string
    capacity: number
    shape: TableShape
    status: TableStatus
    qrToken?: string
    rotation?: number
    isBuilder?: boolean
}

const STATUS_CONFIG: Record<TableStatus, { bg: string; border: string; text: string; glow: string; label: string }> = {
    available: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-300 dark:border-emerald-700',
        text: 'text-emerald-700 dark:text-emerald-300',
        glow: '',
        label: 'Disponible'
    },
    occupied: {
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-400 dark:border-red-600',
        text: 'text-red-700 dark:text-red-300',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]',
        label: 'Ocupada'
    },
    reserved: {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-400 dark:border-amber-600',
        text: 'text-amber-700 dark:text-amber-300',
        glow: 'shadow-[0_0_10px_rgba(245,158,11,0.35)]',
        label: 'Reservada'
    },
    cleaning: {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-300 dark:border-blue-600',
        text: 'text-blue-700 dark:text-blue-300',
        glow: '',
        label: 'Limpiando'
    },
    billing: {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-400 dark:border-purple-600',
        text: 'text-purple-700 dark:text-purple-300',
        glow: 'shadow-[0_0_10px_rgba(168,85,247,0.35)]',
        label: 'Facturando'
    }
}

function ChairDot({ position, index, total }: { position: 'top' | 'bottom' | 'left' | 'right'; index: number; total: number }) {
    const getStyle = () => {
        const offset = total > 1 ? `${(index / (total - 1)) * 60 + 20}%` : '50%'
        switch (position) {
            case 'top': return { top: -10, left: offset, transform: 'translateX(-50%)' }
            case 'bottom': return { bottom: -10, left: offset, transform: 'translateX(-50%)' }
            case 'left': return { left: -10, top: offset, transform: 'translateY(-50%)' }
            case 'right': return { right: -10, top: offset, transform: 'translateY(-50%)' }
        }
    }
    return (
        <div
            className="absolute w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-zinc-400 dark:border-zinc-500"
            style={{ position: 'absolute', ...getStyle() }}
        />
    )
}

function renderChairs(capacity: number, shape: TableShape) {
    if (capacity <= 0) return null
    const chairs: React.ReactNode[] = []
    if (shape === 'circle' || shape === 'oval') {
        // Distribute chairs evenly around the circle
        const count = Math.min(capacity, 12)
        const angles = Array.from({ length: count }, (_, i) => (i * 360) / count)
        angles.forEach((angle, i) => {
            const rad = (angle * Math.PI) / 180
            const rx = 50, ry = 50 // percentage offsets from center
            chairs.push(
                <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-zinc-400 dark:border-zinc-500"
                    style={{
                        position: 'absolute',
                        top: `calc(50% + ${Math.sin(rad) * ry}% - 6px)`,
                        left: `calc(50% + ${Math.cos(rad) * rx}% - 6px)`,
                    }}
                />
            )
        })
    } else {
        // Rectangle: distribute chairs on sides
        const sides = { top: 0, bottom: 0, left: 0, right: 0 }
        const perSide = Math.ceil(capacity / 4)
        let remaining = capacity
        if (remaining > 0) { sides.top = Math.min(perSide, remaining); remaining -= sides.top }
        if (remaining > 0) { sides.bottom = Math.min(perSide, remaining); remaining -= sides.bottom }
        if (remaining > 0) { sides.left = Math.min(Math.ceil(perSide / 2), remaining); remaining -= sides.left }
        if (remaining > 0) { sides.right = Math.min(remaining, perSide) }

        ;(['top', 'bottom', 'left', 'right'] as const).forEach(side => {
            for (let i = 0; i < sides[side]; i++) {
                chairs.push(<ChairDot key={`${side}-${i}`} position={side} index={i} total={sides[side]} />)
            }
        })
    }
    return chairs
}

const TableNode = ({ data, selected }: NodeProps) => {
    const d = data as TableNodeData
    const status = d.status || 'available'
    const config = STATUS_CONFIG[status]
    const isCircle = d.shape === 'circle' || d.shape === 'oval'
    const isOccupied = status === 'occupied'

    return (
        <div className="relative" style={{ width: '100%', height: '100%', padding: '14px' }}>
            {/* Chairs */}
            {renderChairs(d.capacity || 4, d.shape || 'rectangle')}

            {/* Table Surface */}
            <div
                className={cn(
                    'w-full h-full flex flex-col items-center justify-center gap-0.5',
                    'border-2 transition-all duration-300',
                    isCircle ? 'rounded-full' : 'rounded-xl',
                    config.bg,
                    config.border,
                    config.glow,
                    selected && 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400',
                    isOccupied && 'animate-[pulse_3s_ease-in-out_infinite]'
                )}
            >
                {/* Icon */}
                <UtensilsCrossed className={cn('w-4 h-4 opacity-60', config.text)} />

                {/* Table Name */}
                <span className={cn('text-[10px] font-bold leading-tight text-center px-1', config.text)}>
                    {d.tableIdentifier || d.label || 'Mesa'}
                </span>

                {/* Capacity */}
                <div className={cn('flex items-center gap-0.5', config.text, 'opacity-70')}>
                    <Users className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-medium">{d.capacity || 4}</span>
                </div>

                {/* Status badge — only in live mode */}
                {!d.isBuilder && (
                    <div className={cn(
                        'mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-semibold tracking-wide uppercase',
                        config.text,
                        'bg-white/40 dark:bg-black/20'
                    )}>
                        {config.label}
                    </div>
                )}
            </div>

            {/* Builder-mode node resizer */}
            {d.isBuilder && (
                <NodeResizer
                    minWidth={80}
                    minHeight={80}
                    isVisible={selected}
                    lineClassName="border-blue-500"
                    handleClassName="bg-blue-500 border-white rounded-sm"
                />
            )}
        </div>
    )
}

export default memo(TableNode)
