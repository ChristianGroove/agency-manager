import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function LogicProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    
    // CONDITION LOGIC
    if (node.type === 'condition') {
        const conditions = (formData.conditions as any[]) || [{ variable: '', operator: '==', value: '' }];
        
        return (
            <BasePropertyLayout title="Reglas Lógicas" description="Divide el flujo según condiciones personalizadas.">
                <div className="space-y-4">
                    <Label>Tipo de Lógica (AND/OR)</Label>
                    <Select value={(formData.logic as string) || 'ALL'} onValueChange={(v) => onChange('logic', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas las condiciones (AND)</SelectItem>
                            <SelectItem value="ANY">Cualquier condición (OR)</SelectItem>
                        </SelectContent>
                    </Select>

                    {conditions.map((cond, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Condición {index + 1}</span>
                                {conditions.length > 1 && (
                                    <Button variant="ghost" size="sm" onClick={() => onChange('conditions', conditions.filter((_, i) => i !== index))}>
                                        <X size={14} />
                                    </Button>
                                )}
                            </div>
                            <Input 
                                placeholder="{{lead.score}}" 
                                value={cond.variable} 
                                onChange={(e) => {
                                    const newConds = [...conditions];
                                    newConds[index].variable = e.target.value;
                                    onChange('conditions', newConds);
                                }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Select value={cond.operator} onValueChange={(v) => {
                                    const newConds = [...conditions];
                                    newConds[index].operator = v;
                                    onChange('conditions', newConds);
                                }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="==">== Igual</SelectItem>
                                        <SelectItem value="!=">!= Diferente</SelectItem>
                                        <SelectItem value=">">{'>'} Mayor</SelectItem>
                                        <SelectItem value="<">{'<'} Menor</SelectItem>
                                        <SelectItem value="contains">Contiene</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input 
                                    placeholder="Valor" 
                                    value={cond.value} 
                                    onChange={(e) => {
                                        const newConds = [...conditions];
                                        newConds[index].value = e.target.value;
                                        onChange('conditions', newConds);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => onChange('conditions', [...conditions, { variable: '', operator: '==', value: '' }])}>
                        <Plus size={14} className="mr-1" /> Añadir Condición
                    </Button>
                </div>
            </BasePropertyLayout>
        );
    }

    // WAIT LOGIC
    if (node.type === 'wait') {
        return (
            <BasePropertyLayout title="Configuración de Espera">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Duración</Label>
                        <Input type="number" value={(formData.duration as number) || 1} onChange={(e) => onChange('duration', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Select value={(formData.unit as string) || 'minutes'} onValueChange={(v) => onChange('unit', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="minutes">Minutos</SelectItem>
                                <SelectItem value="hours">Horas</SelectItem>
                                <SelectItem value="days">Días</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </BasePropertyLayout>
        );
    }

    // AB TEST LOGIC
    if (node.type === 'ab_test') {
        const paths = (formData.paths as any[]) || [{ label: 'Variante A', percentage: 50 }, { label: 'Variante B', percentage: 50 }];
        return (
            <BasePropertyLayout title="Split A/B Test" description="Divide el tráfico aleatoriamente entre variantes.">
                <div className="space-y-4">
                    {paths.map((path, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-2">
                            <Input value={path.label} onChange={(e) => {
                                const newPaths = [...paths];
                                newPaths[index].label = e.target.value;
                                onChange('paths', newPaths);
                            }} />
                            <div className="flex items-center gap-2">
                                <Input type="number" value={path.percentage} onChange={(e) => {
                                    const newPaths = [...paths];
                                    newPaths[index].percentage = parseInt(e.target.value);
                                    onChange('paths', newPaths);
                                }} />
                                <span className="text-xs text-muted-foreground">%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </BasePropertyLayout>
        );
    }

    return null;
}
