
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, BotOff, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default function ConversationNode({ data, selected }: NodeProps) {
    const actionLabel: Record<string, string> = {
        'deactivate_bot': 'Desactivar Bot',
        'resolve_conversation': 'Resolver Conversación',
        'set_unread': 'Marcar no leído',
    };

    const actionIcons: Record<string, any> = {
        'deactivate_bot': BotOff,
        'resolve_conversation': CheckCircle2,
        'set_unread': MoreHorizontal,
    };

    const displayAction = actionLabel[(data.actionType as string) || ''] || 'Acción de Conversación';
    const ActionIcon = actionIcons[(data.actionType as string) || ''] || MessageSquare;

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            selected ? "border-sky-500 shadow-xl scale-105 ring-1 ring-sky-500" : "border-zinc-200 dark:border-zinc-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide uppercase">
                    Conversación
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium bg-sky-50 dark:bg-sky-950/30 p-2 rounded border border-sky-100 dark:border-sky-900/50">
                    <ActionIcon className="h-4 w-4 shrink-0" />
                    <span className="text-xs truncate">
                        {displayAction}
                    </span>
                </div>
                {typeof data.label === 'string' && data.label !== displayAction && (
                    <>
                        <p className="text-[10px] text-zinc-400 text-center mt-1 truncate px-1">
                            {String(data.label)}
                        </p>
                    </>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
}
