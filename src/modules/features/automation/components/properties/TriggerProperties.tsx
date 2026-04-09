import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Clock, Box } from 'lucide-react';
import { ChannelSelector } from '../channel-selector';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';

export function TriggerProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    const triggerType = (formData.triggerType as string) || 'webhook';

    return (
        <BasePropertyLayout 
            title="Configuración de Trigger"
            description="Define qué evento dispara este flujo de automatización."
        >
            <div className="space-y-3">
                <Label>Tipo de Disparador</Label>
                <Select
                    value={triggerType}
                    onValueChange={(v) => onChange('triggerType', v)}
                >
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                        <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="webhook">📨 Cualquier Mensaje</SelectItem>
                        <SelectItem value="first_contact">🆕 Solo Primer Contacto (Lead Nuevo)</SelectItem>
                        <SelectItem value="keyword">🔑 Palabra Clave Específica</SelectItem>
                        <SelectItem value="business_hours">🏢 Solo en Horario de Oficina</SelectItem>
                        <SelectItem value="outside_hours">🌙 Solo Fuera de Horario (Auto-Respuesta)</SelectItem>
                        <SelectItem value="media_received">📸 Media Recibida (Imagen/Video/Audio)</SelectItem>
                        <SelectItem value="meta_ads">📢 Origin: Meta Ads (FB/IG)</SelectItem>
                        <SelectItem value="schedule" disabled>⏰ Programado (Próximamente)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    {triggerType === 'first_contact'
                        ? '🎯 Solo se dispara cuando un lead nuevo escribe por primera vez.'
                        : triggerType === 'keyword'
                            ? '🔍 Solo se dispara cuando el mensaje contiene la palabra clave.'
                            : triggerType === 'business_hours'
                                ? '🏢 Solo se dispara durante el horario laboral configurado.'
                                : triggerType === 'outside_hours'
                                    ? '🌙 Se dispara cuando el mensaje llega fuera del horario de oficina.'
                                    : triggerType === 'media_received'
                                        ? '📸 Se dispara cuando el usuario envía una imagen, video, audio o documento.'
                                        : triggerType === 'meta_ads'
                                            ? '📢 Se dispara solo para leads que vienen de Anuncios de Facebook o Instagram.'
                                            : '📬 Se dispara con cualquier mensaje entrante.'
                    }
                </p>
            </div>

            {(triggerType === 'webhook' || triggerType === 'first_contact' || triggerType === 'keyword') && (
                <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                    <div className="space-y-2">
                        <Label>Canales Activos</Label>
                        <ChannelSelector
                            multiple={true}
                            value={(formData.channels as string[]) || (formData.channel ? [formData.channel] : [])}
                            onChange={(val: any) => {
                                onChange('channels', val);
                                if (Array.isArray(val) && val.length > 0) {
                                    onChange('channel', val[0]);
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                            Selecciona uno o más canales donde este workflow escuchará mensajes.
                        </p>
                    </div>

                    {triggerType === 'keyword' && (
                        <div className="space-y-2">
                            <Label>Palabra Clave</Label>
                            <Input
                                value={(formData.keyword as string) || ''}
                                onChange={(e) => onChange('keyword', e.target.value)}
                                placeholder="ej. info, precios, hola"
                                className="bg-white dark:bg-slate-900"
                            />
                        </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Cooldown (Anti-Spam)
                        </Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                type="number"
                                min="0"
                                value={(formData.cooldown_minutes as number) || 0}
                                onChange={(e) => onChange('cooldown_minutes', parseInt(e.target.value) || 0)}
                                className="w-24 bg-white dark:bg-slate-900"
                            />
                            <span className="text-sm text-muted-foreground">minutos</span>
                        </div>
                    </div>
                </div>
            )}

            {triggerType === 'meta_ads' && (
                <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Globe className="h-4 w-4" />
                        <Label className="text-sm font-semibold">Filtros de Anuncios</Label>
                    </div>
                    <div className="space-y-2">
                        <Label>ID de Campaña</Label>
                        <Input
                            value={(formData.campaign_id as string) || ''}
                            onChange={(e) => onChange('campaign_id', e.target.value)}
                            placeholder="ej. 123456789"
                        />
                    </div>
                </div>
            )}

            {['business_hours', 'outside_hours'].includes(triggerType) && (
                <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Clock className="h-4 w-4" />
                        <Label className="text-sm font-semibold">Horario</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Inicio</Label>
                            <Input 
                                type="number" 
                                value={(formData.start_hour as number) ?? 9} 
                                onChange={(e) => onChange('start_hour', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fin</Label>
                            <Input 
                                type="number" 
                                value={(formData.end_hour as number) ?? 18} 
                                onChange={(e) => onChange('end_hour', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            )}
        </BasePropertyLayout>
    );
}
