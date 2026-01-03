import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export default function SMSNode({ data }: NodeProps) {
    const to = (data.to as string) || '';
    const body = (data.body as string) || '';

    // Format phone number for display
    const displayNumber = to || 'Configure número';

    // Truncate message preview
    const messagePreview = body ? (body.length > 30 ? body.substring(0, 30) + '...' : body) : 'Sin mensaje';

    return (
        <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-green-300 dark:border-green-600 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950 dark:to-lime-950 min-w-[200px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <MessageSquare size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {(data.label as string) || 'Enviar SMS'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Para: {displayNumber}
                    </div>
                    {body && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 italic">
                            "{messagePreview}"
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}
