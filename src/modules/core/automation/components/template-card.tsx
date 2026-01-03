'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowTemplate } from '@/modules/core/automation/templates/types';
import { Eye, Download, Clock, Layers } from 'lucide-react';

interface TemplateCardProps {
    template: WorkflowTemplate;
    onPreview: (template: WorkflowTemplate) => void;
    onImport: (template: WorkflowTemplate) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    marketing: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    sales: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    support: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    analytics: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    internal: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
    intermediate: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400',
    advanced: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
};

export function TemplateCard({ template, onPreview, onImport }: TemplateCardProps) {
    return (
        <Card className="group p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-800 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <Badge className={`${CATEGORY_COLORS[template.category]} text-xs font-medium px-2 py-1`}>
                    {template.category.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={`${DIFFICULTY_COLORS[template.difficulty]} text-[10px] px-2 py-0.5`}>
                    {template.difficulty === 'beginner' && '⭐ Fácil'}
                    {template.difficulty === 'intermediate' && '⭐⭐ Intermedio'}
                    {template.difficulty === 'advanced' && '⭐⭐⭐ Avanzado'}
                </Badge>
            </div>

            {/* Title & Description */}
            <div className="flex-1 mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {template.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {template.description}
                </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Layers size={14} />
                    <span>{template.nodes.length} pasos</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{template.estimatedSetupTime}</span>
                </div>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.tags.slice(0, 3).map((tag, idx) => (
                        <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPreview(template)}
                    className="flex-1 h-9"
                >
                    <Eye size={14} className="mr-1.5" />
                    Vista Previa
                </Button>
                <Button
                    size="sm"
                    onClick={() => onImport(template)}
                    className="flex-1 h-9 bg-blue-600 hover:bg-blue-700"
                >
                    <Download size={14} className="mr-1.5" />
                    Usar Template
                </Button>
            </div>
        </Card>
    );
}
