import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Bot, FileText, Video, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

interface NodeData extends Record<string, unknown> {
    label?: string;
    actionType?: string;
    message?: string;
    headerMediaType?: 'none' | 'image' | 'video' | 'document';
    headerText?: string;
    headerMediaUrl?: string;
    footerText?: string;
}

const ActionNode = ({ data, selected }: { data: NodeData, selected: boolean }) => {
    const isSendMessage = data.actionType === 'send_message';

    if (isSendMessage) {
        return (
            <div className={cn(
                "min-w-[240px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
                selected ? "border-purple-500 shadow-xl scale-105 ring-1 ring-purple-500" : "border-zinc-200 dark:border-zinc-800"
            )}>
                <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125" />

                {/* Header Strip */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                    <div className="p-1 bg-white/20 rounded">
                        <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide">
                        ENVIAR MENSAJE
                    </span>
                </div>

                {/* Content Area */}
                <div className="p-0">
                    {/* Media Header */}
                    {data.headerMediaType === 'image' && data.headerMediaUrl && (
                        <div className="w-full h-32 relative bg-zinc-100 dark:bg-zinc-950/50 overflow-hidden">
                            <img
                                src={data.headerMediaUrl}
                                alt="Header"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {data.headerMediaType === 'video' && (
                        <div className="w-full h-24 bg-zinc-100 dark:bg-zinc-950/50 flex items-center justify-center text-zinc-400 border-b border-dashed border-zinc-200 dark:border-zinc-800">
                            <Video className="h-8 w-8 opacity-50" />
                        </div>
                    )}

                    {data.headerMediaType === 'document' && (
                        <div className="w-full h-16 bg-zinc-50 dark:bg-zinc-950/30 flex items-center justify-center gap-2 text-zinc-500 border-b border-dashed border-zinc-200 dark:border-zinc-800">
                            <FileText className="h-5 w-5 opacity-70" />
                            <span className="text-xs">Documento PDF</span>
                        </div>
                    )}

                    <div className="p-3 space-y-2">
                        {/* Text Header (Title) */}
                        {data.headerText && (
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                                {data.headerText}
                            </p>
                        )}

                        {/* Body */}
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                            {data.message || <span className="text-zinc-400 italic">Escribe el mensaje...</span>}
                        </p>

                        {/* Footer */}
                        {data.footerText && (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                {data.footerText}
                            </p>
                        )}
                    </div>
                </div>

                <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125" />
            </div>
        )
    }

    // Default View for other actions
    return (
        <div className={cn(
            "min-w-[200px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            selected ? "border-purple-500 shadow-xl scale-105 ring-1 ring-purple-500" : "border-zinc-200 dark:border-zinc-800"
        )}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125" />

            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Bot className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    {(data.label || 'ACCIÓN').toUpperCase()}
                </span>
            </div>

            <div className="p-3">
                <div className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {data.message || 'Sin configuración'}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125" />
        </div>
    );
};

export default memo(ActionNode);
