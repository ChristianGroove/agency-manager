import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Zap } from 'lucide-react';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function ButtonsProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'buttons') return null;

    const messageType = (formData.messageType as string) || 'buttons';

    return (
        <BasePropertyLayout title="Mensaje Interactivo" description="Envía un mensaje con botones o listas de opciones.">
            <div className="space-y-6">
                <div className="space-y-3">
                    <Label>Tipo de Mensaje</Label>
                    <Select value={messageType} onValueChange={(v) => onChange('messageType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="buttons">Botones Simples (Max 3)</SelectItem>
                            <SelectItem value="list">Lista de Opciones (Max 10)</SelectItem>
                            <SelectItem value="cta">Llamada a la Acción (URL/Tel)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>Cuerpo del Mensaje</Label>
                    <Textarea 
                        value={(formData.body as string) || ''} 
                        onChange={(e) => onChange('body', e.target.value)} 
                        placeholder="Escribe el mensaje principal..."
                        rows={4}
                    />
                </div>

                {messageType === 'buttons' && (
                    <div className="space-y-3">
                        <Label>Botones</Label>
                        {((formData.buttons as any[]) || []).map((btn, index) => (
                            <div key={index} className="flex gap-2">
                                <Input 
                                    value={btn.title} 
                                    onChange={(e) => {
                                        const btns = [...(formData.buttons as any[])];
                                        btns[index].title = e.target.value;
                                        onChange('buttons', btns);
                                    }} 
                                    placeholder="Botón"
                                />
                                <Button variant="ghost" size="icon" onClick={() => {
                                    const btns = [...(formData.buttons as any[])];
                                    btns.splice(index, 1);
                                    onChange('buttons', btns);
                                }}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => {
                            const btns = [...((formData.buttons as any[]) || [])];
                            if (btns.length < 3) {
                                onChange('buttons', [...btns, { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: '' }]);
                            }
                        }}>
                            <Plus size={14} className="mr-1" /> Añadir Botón
                        </Button>
                    </div>
                )}
            </div>
        </BasePropertyLayout>
    );
}
