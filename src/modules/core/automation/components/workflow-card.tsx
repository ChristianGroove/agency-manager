import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    MoreHorizontal,
    Play,
    Copy,
    Trash2,
    Edit,
    Zap,
    Star,
    Clock,
    GitBranch,
    AlertTriangle,
    MessageCircle,
    Globe
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChannelSelector } from './channel-selector';
import { toast } from 'sonner';

interface WorkflowCardProps {
    id: string;
    name: string;
    description: string;
    type: 'workflow' | 'template';
    category: string;
    status?: 'active' | 'draft' | 'archived';
    nodeCount: number;
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    createdAt?: string;
    updatedAt?: string;
    channelId?: string | null;
    isConflicted?: boolean;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onToggle?: (isActive: boolean) => Promise<void>;
    onChannelChange?: (channelId: string | null) => Promise<void>;
}

const categoryColors: Record<string, string> = {
    sales: 'from-blue-500 to-indigo-600',
    marketing: 'from-pink-500 to-rose-600',
    support: 'from-green-500 to-emerald-600',
    operations: 'from-orange-500 to-amber-600',
    other: 'from-slate-500 to-slate-600',
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Fácil', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    intermediate: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    advanced: { label: 'Avanzado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function WorkflowCard({
    id,
    name,
    description,
    type,
    category,
    status,
    nodeCount,
    tags = [],
    difficulty,
    createdAt,
    updatedAt,
    channelId,
    isConflicted,
    onDuplicate,
    onDelete,
    onToggle,
    onChannelChange
}: WorkflowCardProps) {
    const isTemplate = type === 'template';
    const gradientClass = categoryColors[category] || categoryColors.other;
    const href = isTemplate
        ? `/automations/${crypto.randomUUID()}?template=${id}`
        : `/automations/${id}`;

    const [isActive, setIsActive] = useState(status === 'active');
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async (checked: boolean) => {
        if (!onToggle) return;
        setIsActive(checked); // Optimistic
        setIsToggling(true);
        try {
            await onToggle(checked);
            toast.success(checked ? "Workflow activado" : "Workflow desactivado");
        } catch (error) {
            setIsActive(!checked); // Revert
            toast.error("Error al cambiar estado");
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className={`group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${isConflicted && isActive
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/10'
            : ''
            }`}>

            {/* Conflict Warning Header */}
            {isConflicted && isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-700 flex items-center shadow-sm cursor-help animate-pulse">
                                    <AlertTriangle className="h-3 w-3 mr-1.5" />
                                    Conflicto
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Múltiples bots activos en el mismo canal.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Top Row: Name + Actions */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                        <Link href={href} className="block">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {name}
                            </h3>
                        </Link>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {description || "Sin descripción"}
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        {!isTemplate && (
                            <Switch
                                checked={isActive}
                                onCheckedChange={handleToggle}
                                disabled={isToggling}
                                className="scale-[0.7] data-[state=checked]:bg-green-500 origin-right"
                            />
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={href} className="flex items-center gap-2">
                                        <Edit className="h-4 w-4" />
                                        {isTemplate ? 'Usar Template' : 'Editar'}
                                    </Link>
                                </DropdownMenuItem>
                                {onDuplicate && (
                                    <DropdownMenuItem onClick={onDuplicate}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicar
                                    </DropdownMenuItem>
                                )}
                                {!isTemplate && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Status & Channel Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-2">
                    <div className="flex gap-2">
                        {/* Channel Badge with Selector */}
                        {!isTemplate && onChannelChange && (
                            <ChannelSelector
                                value={channelId}
                                onChange={(val) => onChannelChange(val)}
                                renderTrigger={(selectedChannel) => (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1.5 -ml-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    >
                                        {selectedChannel ? (
                                            <>
                                                {selectedChannel.provider_key.includes('whatsapp') ? <MessageCircle className="h-3 w-3 mr-1 text-green-500" /> : <Globe className="h-3 w-3 mr-1 text-blue-500" />}
                                                {selectedChannel.connection_name}
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="h-3 w-3 mr-1 text-slate-400" />
                                                Sin canal
                                            </>
                                        )}
                                    </Button>
                                )}
                            />
                        )}

                        {isTemplate && (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0 h-5 text-[10px]">
                                <Star className="h-2.5 w-2.5 mr-1" />
                                Template
                            </Badge>
                        )}
                    </div>

                    {/* Node Count */}
                    <span className="text-[10px] text-slate-400 flex items-center bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {nodeCount}
                    </span>
                </div>
            </div>
        </div>
    );
}
