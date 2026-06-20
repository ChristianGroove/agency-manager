import { Handle, Position } from '@xyflow/react';
import { Tag, Plus, Minus } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

interface TagNodeProps {
    data: {
        action?: 'add' | 'remove'
        tagName?: string
    }
    selected?: boolean
}

export function TagNode({ data, selected }: TagNodeProps) {
    const action = data.action || 'add';
    const isAdd = action === 'add';

    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            isAdd
                ? (selected ? "border-amber-500 shadow-xl scale-105 ring-1 ring-amber-500" : "border-zinc-200 dark:border-zinc-800")
                : (selected ? "border-red-500 shadow-xl scale-105 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800")
        )}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-t-lg text-white bg-gradient-to-r",
                isAdd ? "from-amber-400 to-orange-500" : "from-red-500 to-rose-600"
            )}>
                <div className="p-1 bg-white/20 rounded">
                    <Tag className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide flex-1">
                    {isAdd ? 'AÑADIR ETIQUETA' : 'QUITAR ETIQUETA'}
                </span>
                {isAdd ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            </div>

            {/* Content */}
            <div className="p-3">
                <div className={cn(
                    "text-xs border rounded px-2 py-1.5 text-center font-medium truncate",
                    isAdd ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                        : "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                )}>
                    {data.tagName || "Sin etiqueta"}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className={cn(
                    "!w-3 !h-3 !border-2 !border-white transition-all hover:scale-125",
                    isAdd ? "!bg-amber-500" : "!bg-red-500"
                )}
            />
        </div>
    );
}

export default TagNode;
