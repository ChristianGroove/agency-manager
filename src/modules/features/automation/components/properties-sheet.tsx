/**
 * @file PropertiesSheet.tsx
 * @description Orquestador central para la configuración de nodos en el flujo de automatización.
 * 
 * Tras la refactorización (Abril 2026), este componente actúa como un Shell ligero que:
 * 1. Gestiona el estado local del formulario (formData) y validaciones comunes.
 * 2. Carga datos dinámicos (Etapas de CRM, Etiquetas) según el tipo de nodo.
 * 3. Delega la renderización de la UI específica de cada nodo al `PropertyDispatcher`.
 * 
 * @see ARCHITECTURE-automation-ui.md para más detalles.
 */

"use client";
import React, { useState, useEffect } from 'react';
import { getPipelineStages, type PipelineStage } from '@/modules/features/crm/services/logic/pipeline-actions';
import { getTags, type Tag as CRMTag } from '@/modules/features/crm/services/logic/tags-actions';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Node } from '@xyflow/react';
import { Trash2, Copy, Zap, Box, Settings2, Check, Database, Globe, Mail, MessageSquare, MousePointer, Clock, Tag as TagIcon, ArrowRightCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PropertyDispatcher } from './properties/PropertyDispatcher';

interface PropertiesSheetProps {
    node: Node | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (id: string, data: Record<string, unknown>) => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}

export function PropertiesSheet({ node, isOpen, onClose, onUpdate, onDelete, onDuplicate }: PropertiesSheetProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [availableTags, setAvailableTags] = useState<CRMTag[]>([]);

    // Fetch pipeline stages/tags when needed
    useEffect(() => {
        if (node?.type === 'stage' || (node?.type === 'crm' && (node.data as any)?.actionType === 'update_stage')) {
            getPipelineStages().then(setStages).catch(console.error);
        }
        if (node?.type === 'tag' || (node?.type === 'crm' && (node.data as any)?.actionType === 'add_tag')) {
            getTags().then(setAvailableTags).catch(console.error);
        }
    }, [node?.type, (node?.data as any)?.actionType]);

    // Initial load and defaults
    useEffect(() => {
        if (node) {
            const data = { ...node.data } as Record<string, any>;
            
            // Apply defaults if missing
            const defaults: Record<string, any> = {
                trigger: { triggerType: 'webhook' },
                action: { actionType: 'send_message' },
                buttons: { messageType: 'buttons' },
                crm: { actionType: 'create_lead' },
                billing: { actionType: 'create_invoice' },
                conversation: { actionType: 'deactivate_bot' },
                wait_input: { inputType: 'any', timeout: '1h', timeoutAction: 'continue' },
                wait: { unit: 'minutes' }
            };

            const typeDefaults = defaults[node.type as string];
            if (typeDefaults) {
                Object.entries(typeDefaults).forEach(([key, val]) => {
                    if (!data[key]) data[key] = val;
                });
            }

            if (!data.label) data.label = (node.data as any)?.label || `Paso ${node.type}`;
            setFormData(data);
            setErrors({});
        }
    }, [node]);

    const handleChange = (key: string, value: unknown) => {
        setFormData((prev) => {
            const newData = { ...prev, [key]: value };
            if (key === 'triggerType' && value !== 'keyword') delete newData.keyword;
            return newData;
        });

        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        if (!node) return true;
        const newErrors: Record<string, string> = {};

        if (!formData.label || (formData.label as string).trim() === '') {
            newErrors.label = 'El nombre del paso es requerido';
        }

        // Minimal core validations (rest is handled in components or later)
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) {
            toast.error('Corrige los errores antes de guardar');
            return;
        }
        if (node) {
            onUpdate(node.id, formData);
            toast.success('Configuración guardada');
            onClose();
        }
    };

    if (!node) return null;

    // UI Metadata
    const config = {
        trigger: { icon: Zap, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30", label: "Trigger" },
        condition: { icon: Settings2, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30", label: "Logic" },
        crm: { icon: Database, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30", label: "CRM" },
        billing: { icon: Database, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30", label: "Billing" },
        notification: { icon: Mail, color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30", label: "Notification" },
        variable: { icon: Settings2, color: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30", label: "Variable" },
        http: { icon: Globe, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30", label: "HTTP" },
        email: { icon: Mail, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30", label: "Email" },
        sms: { icon: MessageSquare, color: "bg-green-100 text-green-600 dark:bg-green-900/30", label: "SMS" },
        buttons: { icon: MousePointer, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30", label: "Interactive" },
        wait_input: { icon: Clock, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30", label: "Wait Input" },
        tag: { icon: TagIcon, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30", label: "Tags" },
        stage: { icon: ArrowRightCircle, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30", label: "Stage" },
        conversation: { icon: MessageSquare, color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30", label: "Chat" },
        wait: { icon: Clock, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30", label: "Delay" },
    }[node.type as string] || { icon: Box, color: "bg-slate-100 text-slate-600", label: "Action" };

    const HeaderIcon = config.icon;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="p-0 border-none bg-white dark:bg-slate-950 flex flex-col shadow-2xl m-4 rounded-2xl h-[calc(100vh-2rem)] overflow-hidden focus:outline-none ring-0 w-[400px] sm:w-[500px]">
                {/* Header */}
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${config.color} shadow-sm`}>
                                <HeaderIcon size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                                    {formData.label as string || config.label}
                                </SheetTitle>
                                <p className="text-sm font-medium text-muted-foreground mt-1">
                                    {config.label} Control
                                </p>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</Label>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Nombre del Paso</Label>
                            <Input
                                value={(formData.label as string) || ''}
                                onChange={(e) => handleChange('label', e.target.value)}
                                placeholder="ej. Mensaje de Bienvenida"
                                className={`h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${errors.label ? 'border-red-500' : ''}`}
                            />
                            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
                        </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-slate-800" />

                    <PropertyDispatcher 
                        node={node}
                        formData={formData}
                        errors={errors}
                        onChange={handleChange}
                        stages={stages}
                        availableTags={availableTags}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <Button variant="ghost" size="sm" onClick={onDelete} className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                                <Trash2 size={16} />
                            </Button>
                        )}
                        {onDuplicate && (
                            <Button variant="ghost" size="sm" onClick={onDuplicate} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50">
                                <Copy size={16} />
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">Cancelar</Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-6 rounded-xl transition-all active:scale-95">
                            Guardar Cambios
                            <Check size={16} className="ml-2" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
