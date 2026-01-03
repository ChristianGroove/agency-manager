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
    Zap,
    Star,
    Clock,
    GitBranch
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    onDuplicate?: () => void;
    onDelete?: () => void;
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
    onDuplicate,
    onDelete,
}: WorkflowCardProps) {
    const isTemplate = type === 'template';
    const gradientClass = categoryColors[category] || categoryColors.other;
    const href = isTemplate
        ? `/automations/${crypto.randomUUID()}?template=${id}`
        : `/automations/${id}`;

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-1">
            {/* Header Gradient */}
            <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />

            {/* Content */}
            <div className="p-5">
                {/* Top Row: Name + Actions */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <Link href={href} className="block">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {name}
                            </h3>
                        </Link>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {description}
                </p>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {/* Type Badge */}
                    {isTemplate ? (
                        <Badge variant="secondary" className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-400 border-0">
                            <Star className="h-3 w-3 mr-1" />
                            Template
                        </Badge>
                    ) : (
                        <Badge
                            variant="secondary"
                            className={
                                status === 'active'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : status === 'draft'
                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }
                        >
                            {status === 'active' ? '✓ Activo' : status === 'draft' ? '📝 Borrador' : '📦 Archivado'}
                        </Badge>
                    )}

                    {/* Difficulty Badge (templates only) */}
                    {difficulty && difficultyLabels[difficulty] && (
                        <Badge variant="secondary" className={difficultyLabels[difficulty].color}>
                            {difficultyLabels[difficulty].label}
                        </Badge>
                    )}

                    {/* Node Count */}
                    <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {nodeCount} nodos
                    </Badge>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                        {tags.slice(0, 3).map((tag, i) => (
                            <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                            >
                                #{tag}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span className="text-xs px-2 py-0.5 text-slate-500">
                                +{tags.length - 3} más
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    {updatedAt ? (
                        <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(updatedAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short'
                            })}
                        </span>
                    ) : (
                        <span />
                    )}

                    <Link href={href}>
                        <Button
                            size="sm"
                            className={`rounded-full transition-all ${isTemplate
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                                }`}
                        >
                            {isTemplate ? (
                                <>
                                    <Zap className="h-3.5 w-3.5 mr-1" />
                                    Usar
                                </>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 mr-1" />
                                    Abrir
                                </>
                            )}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
