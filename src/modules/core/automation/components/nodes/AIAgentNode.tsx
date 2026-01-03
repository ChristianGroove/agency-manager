import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Sparkles } from 'lucide-react';

export default memo(({ data, selected }: { data: any, selected?: boolean }) => {
    return (
        <div className={`
            w-[280px] bg-white dark:bg-slate-900 border rounded-xl shadow-sm transition-all
            ${selected ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl' : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'}
        `}>
            {/* Input Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900"
            />

            <div className="p-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                        <Bot size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {data.label || 'AI Agent'}
                            </h3>
                            {data.new && (
                                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                                    NEW
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {data.model || 'gpt-4o'}
                        </p>
                    </div>
                </div>

                <div className="mt-3 bg-slate-50 dark:bg-slate-950 rounded-md p-2 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                        <Sparkles size={12} className="text-purple-500 mt-0.5" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                            "{data.userPrompt || 'Configure prompt...'}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Output Handles */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900"
            />
        </div>
    );
});
