import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Smartphone } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default function SMSNode({ data, selected }: NodeProps) {
    const to = (data.to as string) || '';
    const body = (data.body as string) || '';

    // Format phone number for display
    const displayNumber = to || 'Sin número';

    // Truncate message preview
    const messagePreview = body ? (body.length > 40 ? body.substring(0, 40) + '...' : body) : 'Sin mensaje';

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-lime-500 shadow-xl scale-105 ring-1 ring-lime-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    SMS
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                        {displayNumber}
                    </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-2">
                    "{messagePreview}"
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
}
