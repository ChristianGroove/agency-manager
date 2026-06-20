import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

export default function HTTPNode({ data, selected }: NodeProps) {
    const method = (data.method as string) || 'GET';
    const url = (data.url as string) || '';

    // Extract domain from URL for display
    const displayUrl = url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'Configurar URL';

    // Method colors (for badge)
    const methodColors: Record<string, string> = {
        'GET': 'bg-blue-100 text-blue-700 border-blue-200',
        'POST': 'bg-green-100 text-green-700 border-green-200',
        'PUT': 'bg-amber-100 text-amber-700 border-amber-200',
        'PATCH': 'bg-purple-100 text-purple-700 border-purple-200',
        'DELETE': 'bg-red-100 text-red-700 border-red-200'
    };

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-cyan-500 shadow-xl scale-105 ring-1 ring-cyan-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-cyan-500 to-teal-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Globe className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    HTTP REQUEST
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                        methodColors[method] || 'bg-slate-100 text-slate-700'
                    )}>
                        {method}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1 font-mono">
                        {displayUrl}
                    </span>
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
