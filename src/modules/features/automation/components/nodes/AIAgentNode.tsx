import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default memo(({ data, selected }: { data: any, selected?: boolean }) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[260px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-violet-500 shadow-xl scale-105 ring-1 ring-violet-500" : "border-slate-200 dark:border-slate-800"
        )}>
            {/* Input Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-violet-600 to-indigo-700 text-white relative overflow-hidden">
                {/* Sparkle Effect Overlay */}
                <div className="absolute top-0 right-0 p-1 opacity-20">
                    <Sparkles className="h-8 w-8 text-white" />
                </div>

                <div className="p-1 bg-white/20 rounded relative z-10">
                    <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col relative z-10">
                    <span className="text-xs font-semibold tracking-wide leading-none">
                        AGENTE IA
                    </span>
                    <span className="text-[9px] text-violet-200 font-medium leading-none mt-0.5">
                        {data.model || 'GPT-4o'}
                    </span>
                </div>
                {data.new && (
                    <span className="ml-auto text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold">
                        NEW
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="bg-violet-50 dark:bg-violet-950/20 rounded p-2 text-xs border border-violet-100 dark:border-violet-900/30">
                    <div className="flex items-start gap-1.5">
                        <Sparkles size={10} className="text-violet-500 mt-0.5 shrink-0" />
                        <p className="text-slate-600 dark:text-slate-300 italic line-clamp-3 leading-relaxed">
                            "{data.userPrompt || 'Configurar prompt...'}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Output Handles */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
});
