import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Clock, HelpCircle, Plus, Trash2, GitBranch, ArrowRightCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function InteractionProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'wait_input') return null;

    const parseDuration = (d: string) => {
        const match = d.match(/^(\d+)([smhd])$/);
        return match ? { value: parseInt(match[1]), unit: match[2] } : { value: 1, unit: 'h' };
    };

    const formatDuration = (val: number, unit: string) => `${val}${unit}`;

    return (
        <BasePropertyLayout title="Esperar Respuesta" description="Pausa el flujo hasta que el usuario responda.">
            <div className="space-y-6">
                <div className="space-y-3">
                    <Label>Tipo de Respuesta Esperada</Label>
                    <Select value={(formData.inputType as string) || 'any'} onValueChange={(v) => onChange('inputType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="any">Cualquier Respuesta</SelectItem>
                            <SelectItem value="text">Solo Texto</SelectItem>
                            <SelectItem value="button_click">Botones/Listas</SelectItem>
                            <SelectItem value="image">Imagen</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>Guardar en Variable</Label>
                    <Input 
                        value={(formData.storeAs as string) || ''} 
                        onChange={(e) => onChange('storeAs', e.target.value)} 
                        placeholder="ej. nombre_cliente"
                    />
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/50 space-y-4">
                    <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                        <Clock className="h-4 w-4" /> Timeout
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Input 
                            type="number" 
                            value={parseDuration((formData.timeout as string) || '1h').value} 
                            onChange={(e) => onChange('timeout', formatDuration(parseInt(e.target.value), parseDuration((formData.timeout as string) || '1h').unit))}
                        />
                        <Select 
                            value={parseDuration((formData.timeout as string) || '1h').unit} 
                            onValueChange={(u) => onChange('timeout', formatDuration(parseDuration((formData.timeout as string) || '1h').value, u))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="m">Minutos</SelectItem>
                                <SelectItem value="h">Horas</SelectItem>
                                <SelectItem value="d">Días</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Ramas por Palabras Clave</Label>
                        <Button variant="outline" size="sm" onClick={() => {
                            const branches = (formData.keywordBranches as any[]) || [];
                            onChange('keywordBranches', [...branches, { keyword: '', branchId: Math.random().toString(36).substr(2, 9), matchType: 'exact' }]);
                        }}>
                            <Plus size={14} className="mr-1" /> Nueva Rama
                        </Button>
                    </div>
                    {((formData.keywordBranches as any[]) || []).map((branch, index) => (
                        <div key={index} className="flex gap-2 p-2 border rounded-lg bg-white dark:bg-slate-900">
                            <Input 
                                value={branch.keyword} 
                                onChange={(e) => {
                                    const branches = [...(formData.keywordBranches as any[])];
                                    branches[index].keyword = e.target.value;
                                    onChange('keywordBranches', branches);
                                }} 
                                placeholder="keyword"
                                className="h-8"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                const branches = [...(formData.keywordBranches as any[])];
                                branches.splice(index, 1);
                                onChange('keywordBranches', branches);
                            }}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </BasePropertyLayout>
    );
}
