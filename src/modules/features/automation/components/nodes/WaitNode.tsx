import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

const WaitNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-amber-500 shadow-xl scale-105 ring-1 ring-amber-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    {(data.label as string || 'ESPERA').toUpperCase()}
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="text-center bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-100 dark:border-amber-900/50">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {String(data.duration ?? '0')}
                    </div>
                    <div className="text-[10px] uppercase font-medium text-amber-600/70 dark:text-amber-400/70">
                        {String(data.unit ?? 'mins')}
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
};

export default memo(WaitNode);
