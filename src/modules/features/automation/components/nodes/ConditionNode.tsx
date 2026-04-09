import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Split } from 'lucide-react';
import { cn } from '@/lib/utils';

const ConditionNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-slate-500 shadow-xl scale-105 ring-1 ring-slate-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-slate-500 to-gray-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <GitBranch className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    CONDICIÓN
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800/50">
                    <Split className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-medium truncate">
                        {data.condition ? String(data.condition) : 'Configurar regla'}
                    </span>
                </div>
            </div>

            {/* True Handle */}
            <div className="absolute -bottom-3 left-1/4 translate-y-0">
                <div className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-sm font-bold border border-white dark:border-slate-900">
                    SÍ
                </div>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="true"
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-green-400"
                />
            </div>

            {/* False Handle */}
            <div className="absolute -bottom-3 right-1/4 translate-y-0">
                <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-sm font-bold border border-white dark:border-slate-900">
                    NO
                </div>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="false"
                    className="!w-3 !h-3 !bg-red-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-red-400"
                />
            </div>
        </div>
    );
};

export default memo(ConditionNode);
