import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaUpload } from '@/components/ui/media-upload';
import { uploadAutomationMedia } from '@/modules/features/automation/actions';
import { VariableSelector } from '../variable-selector';
import { BasePropertyLayout } from './BasePropertyLayout';
import { BasePropertyProps } from './types';
import { Zap } from 'lucide-react';

export function MessagingProperties({ node, formData, errors, onChange }: BasePropertyProps) {
    const actionType = (formData.actionType as string) || 'send_message';

    const handleVariableSelect = (v: string, targetId: string, fieldKey: string) => {
        const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement;
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
        <BasePropertyLayout title="Configuración de Mensajería">
            <div className="space-y-3">
                <Label>Tipo de Acción</Label>
                <Select
                    value={actionType}
                    onValueChange={(v) => onChange('actionType', v)}
                >
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                        <SelectValue placeholder="Seleccionar acción" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="send_message">Send Message</SelectItem>
                        <SelectItem value="buttons">Interactive Buttons</SelectItem>
                        <SelectItem value="list">List Menu</SelectItem>
                        <SelectItem value="catalog">Product Catalog</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {actionType === 'send_message' && (
                <div className="space-y-4">
                    {/* Media Header */}
                    <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Multimedia (Opcional)</Label>
                            <Select
                                value={(formData.headerMediaType as string) || 'none'}
                                onValueChange={(v) => onChange('headerMediaType', v)}
                            >
                                <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguno</SelectItem>
                                    <SelectItem value="image">Imagen</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="document">Documento</SelectItem>
                                </SelectContent>
                            </Select>

                            {['image', 'video', 'document'].includes((formData.headerMediaType as string)) && (
                                <MediaUpload
                                    value={(formData.headerMediaUrl as string)}
                                    onChange={(url, type, name) => {
                                        onChange('headerMediaUrl', url)
                                        onChange('headerMediaMime', type)
                                        onChange('headerMediaName', name)
                                    }}
                                    onUpload={uploadAutomationMedia}
                                    compact
                                    acceptedTypes={
                                        formData.headerMediaType === 'image' ? ['image/*'] :
                                            formData.headerMediaType === 'video' ? ['video/*'] :
                                                ['application/pdf']
                                    }
                                    label={`Subir ${formData.headerMediaType === 'image' ? 'Imagen' : formData.headerMediaType === 'video' ? 'Video' : 'PDF'}`}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Título (Negrita)</Label>
                            <Input
                                value={(formData.headerText as string) || ''}
                                onChange={(e) => onChange('headerText', e.target.value)}
                                placeholder="Ej: ¡Bienvenido!"
                                className="bg-white dark:bg-slate-900 font-bold"
                            />
                        </div>
                    </div>

                    {/* Message Body */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Cuerpo del Mensaje</Label>
                            <VariableSelector onSelect={(v) => handleVariableSelect(v, 'message-body-textarea', 'message')}>
                                <span className="text-xs text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                    <Zap size={10} /> Insert Variable
                                </span>
                            </VariableSelector>
                        </div>
                        <Textarea
                            id="message-body-textarea"
                            value={(formData.message as string) || ''}
                            onChange={(e) => onChange('message', e.target.value)}
                            placeholder="Hola {{lead.name}}..."
                            rows={5}
                            className={`resize-none bg-slate-50 dark:bg-slate-900 ${errors.message ? 'border-red-500' : ''}`}
                        />
                        {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
                    </div>

                    {/* Footer */}
                    <div className="space-y-2">
                        <Label>Pie de Página (Opcional)</Label>
                        <Input
                            value={(formData.footerText as string) || ''}
                            onChange={(e) => onChange('footerText', e.target.value)}
                            placeholder="Texto pequeño"
                            className="bg-slate-50 dark:bg-slate-900 text-xs"
                        />
                    </div>
                </div>
            )}
        </BasePropertyLayout>
    );
}
