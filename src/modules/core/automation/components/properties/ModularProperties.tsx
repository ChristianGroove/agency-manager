import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function BillingProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'billing') return null;

    return (
        <BasePropertyLayout title="Facturación y Pagos" description="Genera facturas, cotizaciones o enlaces de pago.">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Acción</Label>
                    <Select value={(formData.actionType as string) || 'create_invoice'} onValueChange={(v) => onChange('actionType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="create_invoice">Crear Factura</SelectItem>
                            <SelectItem value="create_quote">Crear Cotización</SelectItem>
                            <SelectItem value="send_quote">Enviar Cotización (WhatsApp)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(formData.actionType === 'create_invoice' || formData.actionType === 'create_quote') && (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Cliente ID</Label>
                            <Input value={(formData.clientId as string) || ''} onChange={(e) => onChange('clientId', e.target.value)} placeholder="{{clientId}}" />
                        </div>
                        <div className="space-y-2">
                            <Label>Items (JSON)</Label>
                            <Textarea 
                                value={(formData.items as string) || ''} 
                                onChange={(e) => onChange('items', e.target.value)} 
                                placeholder='[{"description": "Producto", "quantity": 1, "unit_price": 100}]'
                                rows={4}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>
        </BasePropertyLayout>
    );
}

export function NotificationProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'notification') return null;

    return (
        <BasePropertyLayout title="Notificaciones" description="Envía alertas internas al equipo.">
            <div className="space-y-3">
                <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={(formData.title as string) || ''} onChange={(e) => onChange('title', e.target.value)} placeholder="Nuevo Lead" />
                </div>
                <div className="space-y-2">
                    <Label>Mensaje</Label>
                    <Textarea value={(formData.message as string) || ''} onChange={(e) => onChange('message', e.target.value)} placeholder="Se ha asignado {{lead.name}}" />
                </div>
            </div>
        </BasePropertyLayout>
    );
}

export function VariableProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'variable') return null;

    return (
        <BasePropertyLayout title="Variables" description="Manipula datos y realiza cálculos.">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Operación</Label>
                    <Select value={(formData.actionType as string) || 'set'} onValueChange={(v) => onChange('actionType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="set">Establecer Valor</SelectItem>
                            <SelectItem value="math">Cálculo Matemático</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Variable Destino</Label>
                    <Input value={(formData.targetVar as string) || ''} onChange={(e) => onChange('targetVar', e.target.value)} placeholder="nombre_variable" />
                </div>
                <div className="space-y-2">
                    <Label>Valor / Expresión</Label>
                    <Input value={(formData.value as string) || ''} onChange={(e) => onChange('value', e.target.value)} placeholder="100 o {{otra_var}}" />
                </div>
            </div>
        </BasePropertyLayout>
    );
}

export function ConversationProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'conversation') return null;

    return (
        <BasePropertyLayout title="Conversación" description="Gestiona el estado de la conversación actual.">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Acción</Label>
                    <Select value={(formData.actionType as string) || 'deactivate_bot'} onValueChange={(v) => onChange('actionType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="deactivate_bot">Desactivar Bot</SelectItem>
                            <SelectItem value="resolve_conversation">Resolver Conversación</SelectItem>
                            <SelectItem value="set_unread">Marcar como No Leído</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </BasePropertyLayout>
    );
}
