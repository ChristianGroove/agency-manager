import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
    CheckCircle2,
    Lock,
    LucideIcon,
    Info,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export interface AppNodeData extends Record<string, unknown> {
    key: string;
    label: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    isActive: boolean;
    isLocked: boolean; // True if dependencies not met
    iconName: string;
    onToggle: (key: string) => void;
}

const getIcon = (name: string): LucideIcon => {
    // @ts-ignore
    return Icons[name] || Icons.Box;
};

const AppStoreNode = ({ data, selected }: NodeProps<any>) => {
    const Icon = getIcon(data.iconName);

    // State Logic
    const isActive = data.isActive;
    const isLocked = data.isLocked;
    const isPaid = data.price > 0;

    // Design Tokens based on State
    const borderClass = isActive
        ? "border-green-500 ring-4 ring-green-100"
        : isLocked
            ? "border-slate-200 bg-slate-50 opacity-70 border-dashed"
            : "border-slate-200 hover:border-indigo-400 hover:shadow-xl";

    const bgClass = isActive ? "bg-white" : "bg-white";

    const categoryColors: Record<string, string> = {
        core: "bg-slate-100 text-slate-600 border-slate-200",
        operations: "bg-blue-50 text-blue-600 border-blue-200",
        finance: "bg-emerald-50 text-emerald-600 border-emerald-200",
        automation: "bg-purple-50 text-purple-600 border-purple-200",
        config: "bg-orange-50 text-orange-600 border-orange-200"
    };

    // Fallback for unknown categories
    const badgeColor = categoryColors[data.category] || "bg-slate-100 text-slate-800";

    return (
        <div className={cn(
            "w-[300px] rounded-xl border-2 transition-all duration-300 relative group flex flex-col overflow-hidden shadow-sm",
            borderClass,
            bgClass,
            selected && !isLocked && "ring-4 border-indigo-500 shadow-xl scale-105 z-20"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className={cn("w-3 h-3 -top-1.5 !bg-slate-400 border-2 border-white transition-colors", isActive && "!bg-green-500 w-4 h-4")}
            />

            {/* Header / Banner */}
            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 relative">
                <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                        "p-2.5 rounded-xl shadow-sm border",
                        isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-white border-slate-200 text-slate-600"
                    )}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-bold", badgeColor)}>
                        {data.category}
                    </Badge>

                    {isLocked ? (
                        <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                            <Lock className="w-3 h-3" /> Bloqueado
                        </div>
                    ) : isActive ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVO
                        </div>
                    ) : (
                        <div className={cn(
                            "font-bold px-2 py-0.5 rounded text-sm",
                            isPaid ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                        )}>
                            {isPaid ? `$${data.price}` : 'FREE'}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 flex flex-col gap-2 relative">
                <h3 className={cn("font-bold text-slate-900 text-lg", isLocked && "text-slate-500")}>
                    {data.label}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 min-h-[60px]">
                    {data.description}
                </p>
            </div>

            {/* Footer / Actions */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-slate-400 hover:text-indigo-600">
                                <Info className="w-4 h-4" /> <span className="text-xs">Detalles</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-xs p-3">
                            {data.description}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {!isActive && !isLocked && (
                    <Button
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onToggle(data.key);
                        }}
                        className={cn(
                            "h-8 text-xs rounded-full px-5 transition-all font-semibold shadow-sm",
                            isPaid
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                    >
                        {isPaid ? "Comprar" : "Añadir"}
                    </Button>
                )}

                {isActive && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50">
                        Configurar →
                    </Button>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className={cn("w-3 h-3 -bottom-1.5 !bg-slate-400 border-2 border-white transition-colors", isActive && "!bg-green-500 w-4 h-4")}
            />
        </div>
    );
};

export default memo(AppStoreNode);
