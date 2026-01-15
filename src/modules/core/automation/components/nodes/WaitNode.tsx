import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

const WaitNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white dark:bg-slate-900 border-2 transition-all min-w-[150px] ${selected ? 'border-amber-500 shadow-amber-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'
            }`}>
            <Handle type="target" position={Position.Top} className="!bg-slate-400" />

            <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {data.label as string || 'Wait'}
                    </div>
                    {(data.duration !== undefined || data.unit !== undefined) && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {String(data.duration ?? '0')} {String(data.unit ?? 'mins')}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
        </div>
    );
};

export default memo(WaitNode);
