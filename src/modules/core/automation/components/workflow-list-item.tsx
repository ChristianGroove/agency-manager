'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MoreHorizontal,
    Play,
    Copy,
    Trash2,
    Edit,
    Star,
    GitBranch,
    ChevronRight
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkflowListItemProps {
    id: string;
    name: string;
    description: string;
    type: 'workflow' | 'template';
    category: string;
    status?: 'active' | 'draft' | 'archived';
    nodeCount: number;
    tags?: string[];
    updatedAt?: string;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

const categoryColors: Record<string, string> = {
    sales: 'bg-blue-500',
    marketing: 'bg-pink-500',
    support: 'bg-green-500',
    operations: 'bg-orange-500',
    other: 'bg-slate-500',
};

export function WorkflowListItem({
    id,
    name,
    description,
    type,
    category,
    status,
    nodeCount,
    tags = [],
    updatedAt,
    onDuplicate,
    onDelete,
}: WorkflowListItemProps) {
    const isTemplate = type === 'template';
    const href = isTemplate
        ? `/automations/${crypto.randomUUID()}?template=${id}`
        : `/automations/${id}`;

    return (
        <div className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all">
            {/* Category Indicator */}
            <div className={`w-1 h-12 rounded-full ${categoryColors[category] || categoryColors.other}`} />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <Link href={href}>
                        <h3 className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors">
                            {name}
                        </h3>
                    </Link>

                    {/* Type Badge */}
                    {isTemplate ? (
                        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs">
                            <Star className="h-2.5 w-2.5 mr-1" />
                            Template
                        </Badge>
                    ) : (
                        <Badge
                            variant="secondary"
                            className={`text-xs ${status === 'active'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                        >
                            {status === 'active' ? 'Activo' : 'Borrador'}
                        </Badge>
                    )}
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {description}
                </p>
            </div>

            {/* Meta Info */}
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4" />
                    <span>{nodeCount} nodos</span>
                </div>

                {updatedAt && (
                    <span className="text-slate-400">
                        {new Date(updatedAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                        })}
                    </span>
                )}

                {tags.length > 0 && (
                    <div className="flex gap-1">
                        {tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs text-slate-400">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Link href={href}>
                    <Button size="sm" variant="ghost" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        {isTemplate ? 'Usar' : 'Editar'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={href} className="flex items-center gap-2">
                                {isTemplate ? <Play className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                {isTemplate ? 'Usar Template' : 'Editar'}
                            </Link>
                        </DropdownMenuItem>
                        {onDuplicate && (
                            <DropdownMenuItem onClick={onDuplicate}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                            </DropdownMenuItem>
                        )}
                        {!isTemplate && onDelete && (
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
    );
}
