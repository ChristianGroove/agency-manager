import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calculator, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';

const VariableNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-fuchsia-500 shadow-xl scale-105 ring-1 ring-fuchsia-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Calculator className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    VARIABLES
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded p-2 text-xs border border-fuchsia-100 dark:border-fuchsia-900/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Variable className="h-3 w-3 text-fuchsia-500 opacity-70" />
                        <span className="font-mono font-bold text-fuchsia-700 dark:text-fuchsia-300">
                            {data.targetVar as string || 'var'}
                        </span>
                    </div>
                    <div className="pl-5 text-slate-500 font-mono truncate text-[10px]">
                        {data.actionType === 'set' ? `= ${data.value}` : `${data.actionType} (${data.operand1}, ${data.operand2})`}
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

export default memo(VariableNode);
