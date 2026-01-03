import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Bot } from 'lucide-react';

interface NodeData extends Record<string, unknown> {
    label?: string;
    actionType?: string;
    message?: string;
}

const ActionNode = ({ data, selected }: { data: NodeData, selected: boolean }) => {
    return (
        <div className={`px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all w-64 ${selected ? 'border-purple-500 shadow-purple-500/20' : 'border-slate-100 dark:border-slate-800'}`}>
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
