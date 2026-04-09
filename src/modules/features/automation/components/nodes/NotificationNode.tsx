import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NotificationNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-sky-500 shadow-xl scale-105 ring-1 ring-sky-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-sky-400 to-cyan-500 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Bell className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    NOTIFICACIÓN
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                        {data.userId ? 'Usuario' : 'Administradores'}
                    </span>
                </div>
                <div className="bg-sky-50 dark:bg-sky-950/20 rounded p-2 text-xs border border-sky-100 dark:border-sky-900/30 text-sky-800 dark:text-sky-200 italic truncate">
                    "{data.title as string || 'Sin título'}"
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

export default memo(NotificationNode);
