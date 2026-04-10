import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, MessageCircle, Image, MapPin, Mic, MousePointer } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

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
        color: 'from-violet-500 to-purple-600 text-white'
    },
    text: {
        icon: MessageCircle,
        label: 'Texto',
        color: 'from-blue-500 to-cyan-600 text-white'
    },
    any: {
        icon: MessageCircle,
        label: 'Cualquier',
        color: 'from-slate-500 to-gray-600 text-white'
    },
    image: {
        icon: Image,
        label: 'Imagen',
        color: 'from-pink-500 to-rose-600 text-white'
    },
    location: {
        icon: MapPin,
        label: 'Ubicación',
        color: 'from-green-500 to-emerald-600 text-white'
    },
    audio: {
        icon: Mic,
        label: 'Audio',
        color: 'from-orange-500 to-amber-600 text-white'
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
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-amber-500 shadow-xl scale-105 ring-1 ring-amber-500" : "border-slate-200 dark:border-slate-800"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    ESPERAR RESPUESTA
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                {/* Input Type Badge */}
                <div className="flex items-center justify-center">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r shadow-sm",
                        config.color
                    )}>
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                    </div>
                </div>

                {/* Timeout Display */}
                {timeoutDisplay && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 py-1 px-2 rounded border border-amber-100 dark:border-amber-900/30">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{timeoutDisplay}</span>
                    </div>
                )}

                {/* Store Variable */}
                {data.storeAs && (
                    <div className="text-[10px] text-slate-500 text-center bg-slate-50 dark:bg-slate-800/50 py-1 rounded border border-slate-100 dark:border-slate-800">
                        Guardar en <code className="bg-white dark:bg-black/20 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-amber-600 dark:text-amber-400">{`{{${data.storeAs}}}`}</code>
                    </div>
                )}

                {/* Keyword branches */}
                {data.keywordBranches && data.keywordBranches.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                            Palabras Clave
                        </p>
                        {data.keywordBranches.map((kb: any, i: number) => (
                            <div
                                key={kb.branchId || i}
                                className="relative text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/40 rounded-md px-2.5 py-1.5 font-medium text-amber-700 dark:text-amber-400 flex justify-between items-center group shadow-sm"
                            >
                                <span className="truncate pr-2">
                                    {kb.matchType === 'exact' ? '"' : '*'}{kb.keyword}{kb.matchType === 'exact' ? '"' : '*'}
                                </span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={String(kb.branchId)}
                                    className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-amber-600"
                                    style={{ right: '-20px', top: '50%', transform: 'translateY(-50%)' }}
                                    title={`Keyword: ${kb.keyword}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Validation indicator */}
                {data.validation && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-1 rounded border border-green-100 dark:border-green-900/30">
                        <span>✓ Valida:</span>
                        <span className="font-bold">{data.validation.type.toUpperCase()}</span>
                    </div>
                )}
            </div>

            {/* Output Handles (Success & Timeout) */}
            <div className="absolute -right-3 top-[43px]">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="success"
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-white pointer-events-auto transition-all hover:scale-125"
                    title="Éxito (Cualquier otra)"
                />
            </div>

            {data.timeoutAction === 'branch' && (
                <div className="absolute -right-3 bottom-[20px]">
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="timeout"
                        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white pointer-events-auto transition-all hover:scale-125"
                        title="Expiró el tiempo"
                    />
                </div>
            )}
        </div>
    )
}

export default memo(WaitInputNode)
