'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Zap,
    Star,
    Clock,
    GitBranch,
    ArrowRight,
    X,
    Sparkles,
    Plus
} from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '../templates';

interface TemplatesSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type CategoryFilter = 'all' | 'sales' | 'marketing' | 'support' | 'operations' | 'other';

const CATEGORIES = [
    { value: 'all', label: 'Todas' },
    { value: 'sales', label: '💼 Ventas' },
    { value: 'marketing', label: '📣 Marketing' },
    { value: 'support', label: '🎧 Soporte' },
    { value: 'operations', label: '⚙️ Operaciones' },
];

const categoryColors: Record<string, string> = {
    sales: 'bg-blue-100 text-blue-600',
    marketing: 'bg-purple-100 text-purple-600',
    support: 'bg-green-100 text-green-600',
    operations: 'bg-orange-100 text-orange-600',
    other: 'bg-slate-100 text-slate-600',
};

const difficultyBadges: Record<string, { label: string; class: string }> = {
    beginner: { label: 'Fácil', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    intermediate: { label: 'Medio', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    advanced: { label: 'Avanzado', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function TemplatesSheet({ open, onOpenChange }: TemplatesSheetProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

    const filteredTemplates = useMemo(() => {
        return WORKFLOW_TEMPLATES.filter(t => {
            const matchesSearch =
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, categoryFilter]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Biblioteca de Templates</SheetTitle>
                    <SheetDescription>Explora workflows pre-construidos</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 shrink-0 px-6 py-5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-brand-pink/10 rounded-xl">
                                <Sparkles className="h-5 w-5 text-brand-pink" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                                    Biblioteca de Templates
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Comienza rápidamente con workflows pre-construidos
                                </p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-50 dark:bg-slate-900 border-0 rounded-full h-10"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                                <SelectTrigger className="w-36 bg-slate-50 dark:bg-slate-900 border-0 rounded-full h-10">
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="space-y-3">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">No se encontraron templates</p>
                                    <p className="text-sm mt-1">Intenta con otra búsqueda</p>
                                </div>
                            ) : (
                                filteredTemplates.map((template) => {
                                    const gradient = categoryColors[template.category] || categoryColors.other;
                                    const difficulty = difficultyBadges[template.difficulty];

                                    return (
                                        <Link
                                            key={template.id}
                                            href={`/automations/${crypto.randomUUID()}?template=${template.id}`}
                                            onClick={() => onOpenChange(false)}
                                            className="block group"
                                        >
                                            <div className={`
                                                flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border group
                                                bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 
                                                hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-gray-200/50
                                            `}>
                                                {/* Icon */}
                                                <div className={`
                                                    flex h-12 w-12 shrink-0 items-center justify-center rounded-xl 
                                                    ${gradient} transition-transform group-hover:scale-105
                                                `}>
                                                    <Zap className="h-5 w-5" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-brand-pink transition-colors">
                                                            {template.name}
                                                        </h3>
                                                        {difficulty && (
                                                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${difficulty.class}`}>
                                                                {difficulty.label}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mb-2">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <GitBranch className="h-3 w-3" />
                                                            {template.nodes.length} nodos
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {template.estimatedSetupTime}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <div className="h-8 w-8 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-full shrink-0 group-hover:bg-brand-pink/10 transition-colors">
                                                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-pink group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between z-20 gap-4">
                        <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900 dark:text-white">{WORKFLOW_TEMPLATES.length}</span> templates disponibles
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                Cerrar
                            </Button>
                            <Link href={`/automations/${crypto.randomUUID()}`} onClick={() => onOpenChange(false)}>
                                <Button className="shadow-lg shadow-gray-200 bg-brand-pink hover:bg-brand-pink/90 text-white">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Desde Cero
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
