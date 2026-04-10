import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database, UserPlus, Tag, ArrowRightCircle } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default function CRMNode({ data, selected }: NodeProps) {
    const actionLabel: Record<string, string> = {
        'create_lead': 'Crear Lead',
        'update_stage': 'Actualizar Etapa',
        'add_tag': 'Agregar Etiqueta',
    };

    const actionIcons: Record<string, any> = {
        'create_lead': UserPlus,
        'update_stage': ArrowRightCircle,
        'add_tag': Tag,
    };

    const displayAction = actionLabel[(data.actionType as string) || ''] || 'Acción de CRM';
    const ActionIcon = actionIcons[(data.actionType as string) || ''] || Database;

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-indigo-500 shadow-xl scale-105 ring-1 ring-indigo-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Database className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    CRM
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded border border-indigo-100 dark:border-indigo-900/50">
                    <ActionIcon className="h-4 w-4 shrink-0" />
                    <span className="text-xs truncate">
                        {displayAction}
                    </span>
                </div>
                {typeof data.label === 'string' && data.label !== displayAction && (
                    <>
                        <p className="text-[10px] text-slate-400 text-center mt-1 truncate px-1">
                            {String(data.label)}
                        </p>
                    </>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
}
