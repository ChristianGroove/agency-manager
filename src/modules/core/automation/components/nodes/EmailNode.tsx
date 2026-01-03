import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';

export default function EmailNode({ data }: NodeProps) {
    const to = (data.to as string) || '';
    const subject = (data.subject as string) || '';

    // Extract first recipient if multiple
    const firstRecipient = to.split(',')[0].trim() || 'Configure destinatario';

    return (
        <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-purple-300 dark:border-purple-600 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 min-w-[200px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Mail size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {(data.label as string) || 'Enviar Email'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Para: {firstRecipient}
                    </div>
                    {subject && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 italic">
                            {subject}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}
