import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail, AtSign } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default function EmailNode({ data, selected }: NodeProps) {
    const to = (data.to as string) || '';
    const subject = (data.subject as string) || '';

    // Extract first recipient if multiple
    const firstRecipient = to.split(',')[0].trim() || 'Sin destinatario';

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-fuchsia-500 shadow-xl scale-105 ring-1 ring-fuchsia-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    EMAIL
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 p-2 bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded border border-fuchsia-100 dark:border-fuchsia-900/30">
                    <AtSign className="h-3.5 w-3.5 text-fuchsia-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Para</p>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {firstRecipient}
                        </p>
                    </div>
                </div>

                {subject && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate px-1">
                        "{subject}"
                    </p>
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
