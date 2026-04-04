import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function IntegrationProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    
    // HTTP WEBHOOK / API CALL
    if (node.type === 'http') {
        return (
            <BasePropertyLayout title="Configuración HTTP" description="Realiza peticiones a APIs externas.">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Método<span className="text-red-500 ml-1">*</span></Label>
                        <Select value={(formData.method as string) || 'GET'} onValueChange={(v) => onChange('method', v)}>
                            <SelectTrigger className={errors.method ? 'border-red-500' : ''}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Timeout (ms)</Label>
                        <Input type="number" value={(formData.timeout as number) || 30000} onChange={(e) => onChange('timeout', parseInt(e.target.value))} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>URL<span className="text-red-500 ml-1">*</span></Label>
                    <Input value={(formData.url as string) || ''} onChange={(e) => onChange('url', e.target.value)} placeholder="https://api.example.com" />
                </div>
                {['POST', 'PUT', 'PATCH'].includes((formData.method as string) || '') && (
                    <div className="space-y-2">
                        <Label>Body (JSON)</Label>
                        <Textarea value={(formData.body as string) || ''} onChange={(e) => onChange('body', e.target.value)} placeholder='{"key": "{{value}}"}' rows={4} className="font-mono text-sm" />
                    </div>
                )}
            </BasePropertyLayout>
        );
    }

    // AI AGENT 
    if (node.type === 'ai_agent') {
        return (
            <BasePropertyLayout title="Agente IA" description="Inteligencia Artificial para procesar o generar respuestas.">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Modelo AI</Label>
                        <Select value={(formData.model as string) || 'gpt-4o'} onValueChange={(v) => onChange('model', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>System Prompt</Label>
                        <Textarea value={(formData.systemPrompt as string) || ''} onChange={(e) => onChange('systemPrompt', e.target.value)} placeholder="Instrucciones del agente..." rows={3} />
                    </div>
                    <div className="space-y-2">
                        <Label>User Prompt</Label>
                        <Textarea value={(formData.userPrompt as string) || ''} onChange={(e) => onChange('userPrompt', e.target.value)} placeholder="Input para procesar..." rows={5} />
                    </div>
                </div>
            </BasePropertyLayout>
        );
    }

    return null;
}
