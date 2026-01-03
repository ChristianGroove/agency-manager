import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';

export default function HTTPNode({ data }: NodeProps) {
    const method = (data.method as string) || 'GET';
    const url = (data.url as string) || '';

    // Extract domain from URL for display
    const displayUrl = url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'Configure URL';

    // Method colors
    const methodColors: Record<string, string> = {
        'GET': 'text-blue-600',
        'POST': 'text-green-600',
        'PUT': 'text-amber-600',
        'PATCH': 'text-purple-600',
        'DELETE': 'text-red-600'
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-cyan-300 dark:border-cyan-600 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950 dark:to-teal-950 min-w-[200px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                    <Globe size={18} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {(data.label as string) || 'HTTP Request'}
                        <span className={`text-xs font-bold ${methodColors[method]}`}>
                            {method}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {displayUrl}
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}
