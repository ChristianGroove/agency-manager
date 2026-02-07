import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Bot, Image as ImageIcon, FileText, Video, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                "min-w-[240px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
                selected ? "border-purple-500 shadow-purple-500/20 ring-1 ring-purple-500" : "border-slate-200 dark:border-slate-800"
            )}>
                <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-slate-400 !border-2 !border-white" />

                {/* Header Strip */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/50">
                    <div className="p-1 bg-white/60 dark:bg-black/20 rounded">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-purple-900 dark:text-purple-300">
                        ENVIAR MENSAJE
                    </span>
                </div>

                {/* Content Area */}
                <div className="p-0">
                    {/* Media Header */}
                    {data.headerMediaType === 'image' && data.headerMediaUrl && (
                        <div className="w-full h-32 relative bg-slate-100 dark:bg-slate-950/50 overflow-hidden">
                            <img
                                src={data.headerMediaUrl}
                                alt="Header"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {data.headerMediaType === 'video' && (
                        <div className="w-full h-24 bg-slate-100 dark:bg-slate-950/50 flex items-center justify-center text-slate-400 border-b border-dashed border-slate-200 dark:border-slate-800">
                            <Video className="h-8 w-8 opacity-50" />
                        </div>
                    )}

                    {data.headerMediaType === 'document' && (
                        <div className="w-full h-16 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center gap-2 text-slate-500 border-b border-dashed border-slate-200 dark:border-slate-800">
                            <FileText className="h-5 w-5 opacity-70" />
                            <span className="text-xs">Documento PDF</span>
                        </div>
                    )}

                    <div className="p-3 space-y-2">
                        {/* Text Header (Title) - Always render if exists */}
                        {data.headerText && (
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                                {data.headerText}
                            </p>
                        )}

                        {/* Body */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {data.message || <span className="text-slate-400 italic">Escribe el mensaje...</span>}
                        </p>

                        {/* Footer */}
                        {data.footerText && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 mt-2">
                                {data.footerText}
                            </p>
                        )}
                    </div>
                </div>

                <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-slate-400 !border-2 !border-white" />
            </div>
        )
    }

    // Default View for other actions
    return (
        <div className={cn(
            "px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all w-64",
            selected ? 'border-purple-500 shadow-purple-500/20' : 'border-slate-100 dark:border-slate-800'
        )}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-slate-400" />

            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${data.actionType === 'send_message' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100'}`}>
                    {data.actionType === 'send_message' ? <MessageSquare size={18} /> : <Bot size={18} />}
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {data.label || 'Nodo de Acción'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {data.message || 'Configure action...'}
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-slate-400" />
        </div>
    );
};

export default memo(ActionNode);
