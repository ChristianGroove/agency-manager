import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function SmsProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'sms') return null;

    return (
        <BasePropertyLayout title="Enviar SMS" description="Mensaje de texto corto de hasta 160 caracteres.">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Destinatario (To)</Label>
                    <Input value={(formData.to as string) || ''} onChange={(e) => onChange('to', e.target.value)} placeholder="+1234567890 o {{lead.phone}}" />
                </div>
                <div className="space-y-2">
                    <Label>Mensaje</Label>
                    <Textarea value={(formData.body as string) || ''} onChange={(e) => onChange('body', e.target.value)} placeholder="Hola {{lead.name}}." rows={4} maxLength={160} />
                </div>
            </div>
        </BasePropertyLayout>
    );
}

export function EmailProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    if (node.type !== 'email') return null;

    return (
        <BasePropertyLayout title="Enviar Email" description="Correo electrónico con soporte para variables y HTML.">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Para (To)</Label>
                    <Input value={(formData.to as string) || ''} onChange={(e) => onChange('to', e.target.value)} placeholder="{{lead.email}}" />
                </div>
                <div className="space-y-2">
                    <Label>Asunto</Label>
                    <Input value={(formData.subject as string) || ''} onChange={(e) => onChange('subject', e.target.value)} placeholder="¡Hola {{lead.name}}!" />
                </div>
                <div className="space-y-2">
                    <Label>Cuerpo (HTML)</Label>
                    <Textarea value={(formData.body as string) || ''} onChange={(e) => onChange('body', e.target.value)} placeholder="<h1>Hola</h1><p>Contenido...</p>" rows={6} className="font-mono text-sm" />
                </div>
            </div>
        </BasePropertyLayout>
    );
}
