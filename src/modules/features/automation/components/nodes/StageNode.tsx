import { Handle, Position } from '@xyflow/react';
import { ArrowRightCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';

interface StageNodeProps {
    data: {
        status?: string
    }
    selected?: boolean
}

export function StageNode({ data, selected }: StageNodeProps) {
    return (
        <div className={cn(
            "min-w-[200px] max-w-[240px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-slate-900",
            selected ? "border-blue-500 shadow-xl scale-105 ring-1 ring-blue-500" : "border-slate-200 dark:border-slate-800"
        )}>
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <ArrowRightCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide flex-1">
                    CAMBIAR ETAPA
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Mover a</span>
                    <ArrowRight className="h-3 w-3 text-blue-400" />
                </div>

                <div className="text-xs border border-blue-100 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50 rounded px-2 py-1.5 text-center font-bold truncate tracking-wide">
                    {data.status ? data.status.toUpperCase() : "SIN ETAPA"}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !border-2 !border-white !bg-blue-500 transition-all hover:scale-125"
            />
        </div>
    );
}

export default StageNode;
