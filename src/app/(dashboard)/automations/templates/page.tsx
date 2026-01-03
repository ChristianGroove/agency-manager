'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateCard } from '@/modules/core/automation/components/template-card';
import { WORKFLOW_TEMPLATES } from '@/modules/core/automation/templates';
import { WorkflowTemplate, TEMPLATE_CATEGORIES } from '@/modules/core/automation/templates/types';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

export default function TemplatesGalleryPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter templates
    const filteredTemplates = WORKFLOW_TEMPLATES.filter(template => {
        const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const handleImport = async (template: WorkflowTemplate) => {
        try {
            // Clone template with new IDs
            const clonedNodes = template.nodes.map(node => ({
                ...node,
                id: `node-${nanoid(8)}`,
            }));

            const nodeIdMap = new Map();
            template.nodes.forEach((node, idx) => {
                nodeIdMap.set(node.id, clonedNodes[idx].id);
            });

            const clonedEdges = template.edges.map(edge => ({
                ...edge,
                id: `edge-${nanoid(8)}`,
                source: nodeIdMap.get(edge.source) || edge.source,
                target: nodeIdMap.get(edge.target) || edge.target,
            }));

            // Create workflow (this would call API in real implementation)
            const newWorkflow = {
                id: nanoid(),
                name: `${template.name} (Copia)`,
                description: template.description,
                nodes: clonedNodes,
                edges: clonedEdges,
                template_id: template.id,
            };

            toast.success(`Template "${template.name}" importado exitosamente`);

            // Redirect to editor
            router.push(`/automations/${newWorkflow.id}`);
        } catch (error) {
            console.error('Error importing template:', error);
            toast.error('Error al importar template');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/automations')}
                            className="hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Plantillas de Workflows
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Comienza en minutos con workflows pre-construidos
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            placeholder="Buscar templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-white dark:bg-slate-900"
                        />
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="container max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <Button
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('all')}
                        className="shrink-0"
                    >
                        📚 Todos
                    </Button>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label, icon }]) => (
                        <Button
                            key={key}
                            variant={selectedCategory === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(key)}
                            className="shrink-0"
                        >
                            {icon} {label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            <div className="container max-w-7xl mx-auto px-6 pb-12">
                {filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onPreview={() => toast.info('Preview modal - Coming soon')}
                                onImport={handleImport}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground text-lg">
                            No se encontraron templates con los filtros aplicados
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
