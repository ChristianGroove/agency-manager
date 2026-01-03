import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';

export default function CRMNode({ data }: NodeProps) {
    const actionLabel: Record<string, string> = {
        'create_lead': 'Crear Lead',
        'update_stage': 'Actualizar Etapa',
        'add_tag': 'Agregar Etiqueta',
    };

    const displayAction = actionLabel[(data.actionType as string) || ''] || 'Acción de CRM';

    return (
        <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-indigo-300 dark:border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 min-w-[180px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {(data.label as string) || 'Acción de CRM'}
                    </div>
                </div>
            </div>

            <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                {displayAction}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}
