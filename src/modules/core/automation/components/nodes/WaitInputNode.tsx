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
        keywordBranches?: Array<{ keyword: string, branchId: string, matchType: 'exact' | 'contains' }>
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
                    <p className="text-[10px] text-gray-400 text-center italic">
                        Almacena en <code className="bg-white/50 px-1 rounded-sm border border-amber-200">{`{{${data.storeAs}}}`}</code>
                    </p>
                )}

                {/* Keyword branches */}
                {data.keywordBranches && data.keywordBranches.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {data.keywordBranches.map((kb: any, i: number) => (
                            <div
                                key={kb.branchId || i}
                                className="relative text-[10px] bg-white border border-amber-200 rounded px-2 py-1 font-medium text-amber-700 flex justify-between items-center group"
                            >
                                <span className="truncate pr-1">
                                    {kb.matchType === 'exact' ? '"' : '*'}{kb.keyword}{kb.matchType === 'exact' ? '"' : '*'}
                                </span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={String(kb.branchId)}
                                    className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-amber-600"
                                    style={{ right: '-16px', top: '50%', transform: 'translateY(-50%)' }}
                                    title={`Keyword: ${kb.keyword}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Validation indicator */}
                {data.validation && (
                    <p className="text-[10px] text-amber-600/70 text-center font-medium">
                        ✓ Valida: {data.validation.type}
                    </p>
                )}
            </div>

            {/* Output Handles */}
            <div className="flex flex-col gap-4 absolute -right-3 top-1/2 -translate-y-1/2 h-full justify-center pointer-events-none">
                <div className="relative h-6 w-6">
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="success"
                        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white pointer-events-auto"
                        title="Éxito (Cualquier otra)"
                    />
                </div>

                {data.timeoutAction === 'branch' && (
                    <div className="relative h-6 w-6">
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="timeout"
                            className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white pointer-events-auto"
                            title="Expiró el tiempo"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default WaitInputNode
