import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Receipt, FileText, CreditCard } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

const BillingNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[260px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            selected ? "border-amber-500 shadow-xl scale-105 ring-1 ring-amber-500" : "border-zinc-200 dark:border-zinc-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Receipt className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    FACTURACIÓN
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs border border-amber-100 dark:border-amber-900/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                        <CreditCard className="h-3.5 w-3.5 opacity-70" />
                        <span className="truncate">
                            {(data.actionType as string)?.replace('_', ' ').toUpperCase() || 'ACCIÓN'}
                        </span>
                    </div>

                    {data.itemId !== undefined && (
                        <div className="flex items-start gap-1.5 pl-1 pt-1 border-t border-amber-200 dark:border-amber-800/50">
                            <FileText className="h-3 w-3 text-amber-500 mt-0.5" />
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono truncate">
                                Item ID: {String(data.itemId)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
};

export default memo(BillingNode);
