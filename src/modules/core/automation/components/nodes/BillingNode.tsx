
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Receipt, FileText } from 'lucide-react';

const BillingNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`shadow-lg rounded-xl border-2 bg-white dark:bg-slate-900 min-w-[280px] transition-all duration-200 ${selected ? 'border-amber-500 ring-4 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-amber-400'}`}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400" />

            <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
                        <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {data.label as string || 'Billing'}
                        </h3>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                            Facturación
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 opacity-70" />
                        <span className="font-medium">
                            Action: {(data.actionType as string)?.replace('_', ' ').toUpperCase() || 'SELECT ACTION'}
                        </span>
                    </div>
                    {data.itemId && (
                        <div className="pl-5.5 text-[10px] text-slate-500 truncate">
                            Item: {data.itemId as string}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400" />
        </div>
    );
};

export default memo(BillingNode);
