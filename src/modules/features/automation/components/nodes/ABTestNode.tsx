import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Split, TrendingUp } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';
import { Badge } from '@/components/ui/badge';

interface ABTestNodeProps extends NodeProps {
    data: {
        label?: string;
        paths?: Array<{ id: string; label: string; percentage: number }>;
    }
}

const ABTestNode = ({ data, selected }: ABTestNodeProps) => {
    const paths = data.paths || [
        { id: 'a', label: 'Camino A', percentage: 50 },
        { id: 'b', label: 'Camino B', percentage: 50 }
    ];

    return (
        <div className={cn(
            "min-w-[220px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            selected ? "border-pink-500 shadow-xl scale-105 ring-1 ring-pink-500" : "border-zinc-200 dark:border-zinc-800"
        )}>
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white transition-all hover:scale-125"
            />

            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Split className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide flex-1">
                    TEST A/B
                </span>
                <TrendingUp className="h-3 w-3 opacity-70" />
            </div>

            {/* Content / Paths */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {paths.map((path, index) => (
                    <div
                        key={path.id}
                        className="relative flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800 px-1.5 py-0 h-5 text-[10px]">
                                {path.percentage}%
                            </Badge>
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                {path.label}
                            </span>
                        </div>

                        {/* Dynamic Source Handle for each path */}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={path.id}
                            className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white transition-all hover:scale-125 hover:!bg-pink-600"
                            style={{ right: '-7px', top: '50%', transform: 'translateY(-50%)' }}
                            title={`Ruta: ${path.label}`}
                        />
                    </div>
                ))}
            </div>

            {/* Helper text footer */}
            <div className="bg-zinc-50 dark:bg-zinc-950/30 px-3 py-1.5 rounded-b-lg border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 text-center font-medium">
                    Distribución aleatoria
                </p>
            </div>
        </div>
    );
};

export default memo(ABTestNode);
