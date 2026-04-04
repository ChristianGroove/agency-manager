import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from '@/components/ui/separator';
import { Check, Tag as TagIcon, Plus, Zap } from 'lucide-react';
import { VariableSelector } from '../variable-selector';
import { BasePropertyLayout } from './BasePropertyLayout';
import { CRMPropertyProps } from './types';

export function CRMProperties({ node, formData, errors, onChange, availableTags, stages }: CRMPropertyProps) {
    const actionType = (formData.actionType as string) || 'create_lead';

    const handleVariableSelect = (v: string, targetId: string, fieldKey: string) => {
        const el = document.getElementById(targetId) as HTMLInputElement;
        const current = (formData[fieldKey] as string) || '';
        if (el) {
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const newValue = current.substring(0, start) + v + current.substring(end);
            onChange(fieldKey, newValue);
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + v.length, start + v.length);
            }, 0);
        } else {
            onChange(fieldKey, current + v);
        }
    };

    return (
        <BasePropertyLayout 
            title="Configuración de CRM"
            description="Gestiona prospectos y etapas de venta automáticamente."
        >
            <div className="space-y-3">
                <Label>Acción de CRM</Label>
                <Select
                    value={actionType}
                    onValueChange={(v) => onChange('actionType', v)}
                >
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                        <SelectValue placeholder="Seleccionar acción" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="create_lead">Crear Nuevo Lead</SelectItem>
                        <SelectItem value="update_stage">Actualizar Etapa de Pipeline</SelectItem>
                        <SelectItem value="add_tag">Agregar Etiqueta a Lead</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {actionType === 'create_lead' && (
                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Nombre del Lead<span className="text-red-500 ml-1">*</span></Label>
                            <VariableSelector onSelect={(v) => handleVariableSelect(v, 'crm-lead-name', 'leadName')}>
                                <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                    <Zap size={10} /> Insert Variable
                                </span>
                            </VariableSelector>
                        </div>
                        <Input
                            id="crm-lead-name"
                            value={(formData.leadName as string) || ''}
                            onChange={(e) => onChange('leadName', e.target.value)}
                            placeholder="{{message.sender}}"
                            className="bg-white dark:bg-slate-900 font-mono text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={(formData.leadEmail as string) || ''}
                                onChange={(e) => onChange('leadEmail', e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                                value={(formData.leadPhone as string) || ''}
                                onChange={(e) => onChange('leadPhone', e.target.value)}
                                placeholder="{{phone}}"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {actionType === 'update_stage' && (
                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <div className="space-y-2">
                        <Label>Lead ID<span className="text-red-500 ml-1">*</span></Label>
                        <Input
                            value={(formData.leadId as string) || ''}
                            onChange={(e) => onChange('leadId', e.target.value)}
                            placeholder="{{leadId}}"
                            className="font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Seleccionar Nueva Etapa</Label>
                        <Select
                            value={(formData.newStageId as string) || ''}
                            onValueChange={(v) => onChange('newStageId', v)}
                        >
                            <SelectTrigger className="bg-white dark:bg-slate-900">
                                <SelectValue placeholder="Seleccionar etapa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {actionType === 'add_tag' && (
                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <Label>Etiqueta</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between bg-white dark:bg-slate-900 h-10 px-3 font-normal">
                                <div className="flex items-center gap-2 truncate">
                                    {formData.tagName ? (
                                        <>
                                            <TagIcon size={14} className="text-slate-400" />
                                            <span>{formData.tagName as string}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400">Seleccionar o escribir...</span>
                                    )}
                                </div>
                                <Plus size={14} className="opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar o crear etiqueta..." />
                                <CommandList>
                                    <CommandEmpty>No se encontraron etiquetas.</CommandEmpty>
                                    <CommandGroup heading="Etiquetas Existentes">
                                        {availableTags.map((tag) => (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => onChange('tagName', tag.name)}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                                <span>{tag.name}</span>
                                                {formData.tagName === tag.name && <Check size={14} className="text-blue-500 ml-auto" />}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </BasePropertyLayout>
    );
}
