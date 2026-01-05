"use client"

import { Handle, Position } from '@xyflow/react'
import { Clock, MessageCircle, Image, MapPin, Mic, MousePointer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaitInputNodeProps {
    data: {
        label?: string
        inputType?: 'button_click' | 'text' | 'any' | 'image' | 'location' | 'audio'
        timeout?: string
        timeoutAction?: 'continue' | 'branch' | 'stop'
        storeAs?: string
        validation?: {
            type: string
        }
    }
    selected?: boolean
}

const INPUT_CONFIG = {
    button_click: {
        icon: MousePointer,
        label: 'Clic en Botón',
        color: 'from-violet-500 to-purple-600'
    },
    text: {
        icon: MessageCircle,
        label: 'Texto',
        color: 'from-blue-500 to-cyan-600'
    },
    any: {
        icon: MessageCircle,
        label: 'Cualquier',
        color: 'from-gray-500 to-slate-600'
    },
    image: {
        icon: Image,
        label: 'Imagen',
        color: 'from-pink-500 to-rose-600'
    },
    location: {
        icon: MapPin,
        label: 'Ubicación',
        color: 'from-green-500 to-emerald-600'
    },
    audio: {
        icon: Mic,
        label: 'Audio',
        color: 'from-orange-500 to-amber-600'
    }
}

export function WaitInputNode({ data, selected }: WaitInputNodeProps) {
    const inputType = data.inputType || 'any'
    const config = INPUT_CONFIG[inputType]
    const Icon = config.icon

    // Parse timeout for display
    const parseTimeout = (timeout?: string | number) => {
        if (!timeout) return null
        const strTimeout = String(timeout)
        const value = parseInt(strTimeout)
        const unit = strTimeout.slice(-1)
        const labels: Record<string, string> = { m: 'min', h: 'hora(s)', d: 'día(s)' }
        return `${value} ${labels[unit] || unit}`
    }

    const timeoutDisplay = parseTimeout(data.timeout)

    return (
        <div className={cn(
            "min-w-[180px] max-w-[220px] rounded-xl border-2 border-amber-200 bg-amber-50 shadow-lg transition-all",
            selected && "ring-2 ring-offset-2 ring-amber-500 shadow-xl scale-105"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    ESPERAR RESPUESTA
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                {/* Input Type Badge */}
                <div className="flex items-center justify-center">
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r",
                        config.color
                    )}>
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                    </div>
                </div>

                {/* Timeout Display */}
                {timeoutDisplay && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-amber-700">
                        <Clock className="h-3 w-3" />
                        <span>Timeout: {timeoutDisplay}</span>
                    </div>
                )}

                {/* Store Variable */}
                {data.storeAs && (
                    <p className="text-[10px] text-gray-500 text-center">
                        → <code className="bg-white px-1 rounded">{`{{${data.storeAs}}}`}</code>
                    </p>
                )}

                {/* Validation indicator */}
                {data.validation && (
                    <p className="text-[10px] text-amber-600 text-center">
                        ✓ Validación: {data.validation.type}
                    </p>
                )}
            </div>

            {/* Output Handles */}
            <Handle
                type="source"
                position={Position.Right}
                id="success"
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
                style={{ top: '40%' }}
            />

            {/* Timeout branch handle */}
            {data.timeoutAction === 'branch' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="timeout"
                    className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
                    style={{ top: '70%' }}
                />
            )}
        </div>
    )
}

export default WaitInputNode
