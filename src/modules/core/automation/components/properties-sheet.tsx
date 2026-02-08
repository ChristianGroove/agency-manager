"use client";

import React, { useState, useEffect } from 'react';
import { getPipelineStages, type PipelineStage } from '@/modules/core/crm/pipeline-actions';
import { VariableSelector } from './variable-selector';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaUpload } from '@/components/ui/media-upload';
import { uploadAutomationMedia } from '@/modules/core/automation/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Node } from '@xyflow/react';
import { Trash2, Copy, Zap, Box, Settings2, X, Check, Database, Globe, Mail, MessageSquare, Plus, AlertCircle, MousePointer, Clock, Tag, ArrowRightCircle } from 'lucide-react';
import { ChannelSelector } from './channel-selector';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface PropertiesSheetProps {
    node: Node | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (id: string, data: Record<string, unknown>) => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}

const getAbTestDefaults = () => [
    { id: 'a', label: 'Path A', percentage: 50 },
    { id: 'b', label: 'Path B', percentage: 50 }
];

export function PropertiesSheet({ node, isOpen, onClose, onUpdate, onDelete, onDuplicate }: PropertiesSheetProps) {

    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [stages, setStages] = useState<PipelineStage[]>([]);

    // Fetch pipeline stages when needed
    useEffect(() => {
        if (node?.type === 'stage') {
            getPipelineStages()
                .then(data => setStages(data))
                .catch(err => console.error("Failed to load stages", err));
        }
    }, [node?.type]);

    useEffect(() => {
        if (node) {
            const data = { ...node.data } as Record<string, any>;

            // Set defaults based on node type to fix UI initialization bugs
            if (node.type === 'trigger' && !data.triggerType) {
                data.triggerType = 'webhook';
            }

            if (node.type === 'action' && !data.actionType) {
                data.actionType = 'send_message';
            }

            if (node.type === 'buttons' && !data.messageType) {
                data.messageType = 'buttons';
            }

            if (node.type === 'crm' && !data.actionType) {
                data.actionType = 'create_lead';
            }

            if (node.type === 'billing' && !data.actionType) {
                data.actionType = 'create_invoice';
            }

            if (node.type === 'wait_input') {
                if (!data.inputType) data.inputType = 'any';
                if (!data.timeout) data.timeout = '1h';
                if (!data.timeoutAction) data.timeoutAction = 'continue';
            }

            if (node.type === 'wait' && !data.unit) {
                data.unit = 'minutes';
            }

            if (!data.label) {
                data.label = (node.data as any)?.label || `Paso ${node.type}`;
            }

            setFormData(data);
        }
    }, [node]);

    const handleChange = (key: string, value: unknown) => {
        setFormData((prev) => {
            const newData = { ...prev, [key]: value };

            // Logic to clear stale fields based on type changes
            if (key === 'triggerType' && value !== 'keyword') {
                delete newData.keyword;
            }

            return newData;
        });

        // Clear error when user starts typing
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const validateForm = (): any => {
        if (!node) return { valid: true, errors: {}, count: 0 }; // Guard clause

        const newErrors: Record<string, string> = {};

        // Common validations
        if (!formData.label || (formData.label as string).trim() === '') {
            newErrors.label = 'El nombre del paso es requerido';
        }

        // Trigger node validations
        if (node.type === 'trigger') {
            if (!formData.triggerType) {
                newErrors.triggerType = 'El tipo de trigger es requerido';
            }
        }

        // Action node validations
        if (node.type === 'action') {
            if (!formData.actionType) {
                newErrors.actionType = 'El tipo de acción es requerido';
            }
            if (formData.actionType === 'send_message') {
                if (!formData.message || (formData.message as string).trim() === '') {
                    newErrors.message = 'El contenido del mensaje es requerido';
                }
            }
        }

        // Condition node validations
        if (node.type === 'condition') {
            if (!formData.variable || (formData.variable as string).trim() === '') {
                newErrors.variable = 'La variable es requerida';
            }
            if (!formData.operator) {
                newErrors.operator = 'El operador es requerido';
            }
        }

        // CRM node validations
        if (node.type === 'crm') {
            if (!formData.actionType) {
                newErrors.actionType = 'El tipo de acción CRM es requerido';
            }
            if (formData.actionType === 'create_lead') {
                if (!formData.leadName || (formData.leadName as string).trim() === '') {
                    newErrors.leadName = 'El nombre del lead es requerido';
                }
            } else if (formData.actionType === 'update_stage') {
                if (!formData.leadId || (formData.leadId as string).trim() === '') {
                    newErrors.leadId = 'El ID del lead es requerido';
                }
                if (!formData.newStageId || (formData.newStageId as string).trim() === '') {
                    newErrors.newStageId = 'El ID de la etapa es requerido';
                }
            } else if (formData.actionType === 'add_tag') {
                if (!formData.leadId || (formData.leadId as string).trim() === '') {
                    newErrors.leadId = 'El ID del lead es requerido';
                }
                if (!formData.tagName || (formData.tagName as string).trim() === '') {
                    newErrors.tagName = 'El nombre de la etiqueta es requerido';
                }
            }
        }

        // HTTP node validations
        if (node.type === 'http') {
            if (!formData.url || (formData.url as string).trim() === '') {
                newErrors.url = 'La URL es requerida';
            } else {
                // Validate URL format
                try {
                    new URL(formData.url as string);
                } catch {
                    newErrors.url = 'La URL no tiene un formato válido';
                }
            }
            if (!formData.method) {
                newErrors.method = 'El método HTTP es requerido';
            }
        }

        // Email node validations
        if (node.type === 'email') {
            if (!formData.to || (formData.to as string).trim() === '') {
                newErrors.to = 'El destinatario es requerido';
            } else {
                // Basic email format validation (allows variables)
                const emailValue = formData.to as string;
                if (!emailValue.includes('{{') && !emailValue.includes('@')) {
                    newErrors.to = 'Ingresa un email válido o usa una variable {{...}}';
                }
            }
            if (!formData.subject || (formData.subject as string).trim() === '') {
                newErrors.subject = 'El asunto es requerido';
            }
            if (!formData.body || (formData.body as string).trim() === '') {
                newErrors.body = 'El cuerpo del email es requerido';
            }
        }

        // SMS node validations
        if (node.type === 'sms') {
            if (!formData.to || (formData.to as string).trim() === '') {
                newErrors.to = 'El número de teléfono es requerido';
            }
            if (!formData.body || (formData.body as string).trim() === '') {
                newErrors.body = 'El mensaje SMS es requerido';
            }
        }

        // A/B Test node validations
        if (node.type === 'ab_test') {
            const variants = formData.variants as Array<{ name: string; weight: number }> || [];
            if (variants.length < 2) {
                newErrors.variants = 'Se requieren al menos 2 variantes para A/B test';
            } else {
                const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
                if (totalWeight !== 100) {
                    newErrors.variants = `Los pesos deben sumar 100% (actual: ${totalWeight}%)`;
                }
                const emptyNames = variants.some(v => !v.name || v.name.trim() === '');
                if (emptyNames) {
                    newErrors.variants = 'Todas las variantes deben tener nombre';
                }
            }
        }

        // AI Agent node validations
        if (node.type === 'ai_agent') {
            if (!formData.model) {
                newErrors.model = 'El modelo de IA es requerido';
            }
            if (!formData.prompt || (formData.prompt as string).trim() === '') {
                newErrors.prompt = 'El prompt es requerido';
            }
        }

        // Delay node validations
        if (node.type === 'delay') {
            const duration = formData.duration as number;
            if (!duration || duration <= 0) {
                newErrors.duration = 'La duración debe ser mayor a 0';
            }
            if (!formData.unit) {
                newErrors.unit = 'La unidad de tiempo es requerida';
            }
        }

        // Buttons node validations
        if (node.type === 'buttons') {
            if (!formData.body || (formData.body as string).trim() === '') {
                newErrors.body = 'El mensaje es requerido';
            }
            if (formData.messageType === 'buttons') {
                const buttons = (formData.buttons as any[]) || [];
                if (buttons.length === 0) {
                    newErrors.buttons = 'Agrega al menos un botón';
                }
                if (buttons.some(b => !b.title)) {
                    newErrors.buttons = 'Todos los botones deben tener texto';
                }
            } else if (formData.messageType === 'list') {
                const sections = (formData.sections as any[]) || [];
                if (sections.length === 0) {
                    newErrors.sections = 'Agrega al menos una sección';
                }

                const totalRows = sections.reduce((acc: number, s: any) => acc + (s.rows?.length || 0), 0);
                if (totalRows === 0) {
                    newErrors.sections = 'La lista debe tener al menos una opción';
                }
                if (totalRows > 10) {
                    newErrors.sections = 'Máximo 10 opciones en total permitidas por WhatsApp';
                }

                // Validate individual sections and rows
                let hasEmptyTitles = false;
                sections.forEach((section: any) => {
                    if (!section.title || section.title.trim() === '') {
                        hasEmptyTitles = true;
                    }
                    if (section.rows?.some((r: any) => !r.title || r.title.trim() === '')) {
                        hasEmptyTitles = true;
                    }
                });

                if (hasEmptyTitles) {
                    newErrors.sections = 'Todas las secciones y opciones deben tener título';
                }
            }
        }

        // WaitInput node validations
        if (node.type === 'wait_input') {
            if (!formData.timeout) {
                newErrors.timeout = 'Define un tiempo máximo de espera';
            }
        }

        // Billing node validations
        if (node.type === 'billing') {
            if (!formData.actionType) {
                newErrors.actionType = 'El tipo de acción de facturación es requerido';
            }
            if (formData.actionType === 'create_invoice' && !formData.items) {
                // newErrors.items = 'Items requeridos'; // Optional validation
            }
        }

        // Notification node validations
        if (node.type === 'notification') {
            if (!formData.title || (formData.title as string).trim() === '') {
                newErrors.title = 'El título es requerido';
            }
            if (!formData.message || (formData.message as string).trim() === '') {
                newErrors.message = 'El mensaje es requerido';
            }
        }

        // Variable node validations
        if (node.type === 'variable') {
            if (!formData.targetVar || (formData.targetVar as string).trim() === '') {
                newErrors.targetVar = 'El nombre de la variable es requerido';
            }
            if (!formData.actionType) {
                newErrors.actionType = 'El tipo de operación es requerido';
            }
            if (formData.actionType === 'math' && (!formData.operand1 || !formData.operand2)) {
                newErrors.operands = 'Ambos operandos son requeridos para operaciones matemáticas';
            }
        }

        const validationResult = {
            valid: Object.keys(newErrors).length === 0,
            errors: newErrors,
            count: Object.keys(newErrors).length
        };

        setErrors(newErrors);
        return validationResult;
    };

    const handleSave = () => {
        const result = validateForm();
        if (!result.valid) {
            const firstError = Object.values(result.errors)[0] as string;
            toast.error('Configuración incompleta', {
                description: firstError || `Hay ${result.count} campo(s) con errores.`,
            });
            return;
        }
        if (node) {
            onUpdate(node.id, formData);
            toast.success('Configuración guardada');
            onClose();
        }
    };

    if (!node) return null;

    // Determine styles and icons based on node type
    let HeaderIcon = Box;
    let headerColor = "bg-slate-100 text-slate-600";
    let typeLabel = "Action";

    if (node.type === 'trigger') {
        HeaderIcon = Zap;
        headerColor = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
        typeLabel = "Trigger";
    } else if (node.type === 'condition') {
        HeaderIcon = Settings2;
        headerColor = "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
        typeLabel = "Logic";
    } else if (node.type === 'crm') {
        HeaderIcon = Database;
        headerColor = "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400";
        typeLabel = "CRM";
    } else if (node.type === 'billing') {
        HeaderIcon = Database; // Import Receipt from lucide-react if available, else Database
        headerColor = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
        typeLabel = "Billing";
    } else if (node.type === 'notification') {
        HeaderIcon = Mail; // Import Bell
        headerColor = "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400";
        typeLabel = "Notification";
    } else if (node.type === 'variable') {
        HeaderIcon = Settings2; // Import Calculator
        headerColor = "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400";
        typeLabel = "Variable";
    } else if (node.type === 'http') {
        HeaderIcon = Globe;
        headerColor = "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400";
        typeLabel = "HTTP";
    } else if (node.type === 'email') {
        HeaderIcon = Mail;
        headerColor = "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
        typeLabel = "Email";
    } else if (node.type === 'sms') {
        HeaderIcon = MessageSquare;
        headerColor = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
        typeLabel = "SMS";
    } else if (node.type === 'buttons') {
        HeaderIcon = MousePointer;
        headerColor = "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400";
        typeLabel = "Interactive Buttons";
    } else if (node.type === 'wait_input') {
        HeaderIcon = Clock;
        headerColor = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
        typeLabel = "Wait For Input";
    } else if (node.type === 'tag') {
        HeaderIcon = Tag;
        headerColor = "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
        typeLabel = "Manage Tags";
    } else if (node.type === 'stage') {
        HeaderIcon = ArrowRightCircle;
        headerColor = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
        typeLabel = "Change Stage";
    } else if (node.type === 'wait') {
        HeaderIcon = Clock;
        headerColor = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
        typeLabel = "Wait";
    } else {
        // Action defaults
        HeaderIcon = Box;
        headerColor = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
        typeLabel = "Action";
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[500px] p-0 border-none bg-white dark:bg-slate-950 flex flex-col shadow-2xl m-4 rounded-2xl h-[calc(100vh-2rem)] overflow-hidden focus:outline-none ring-0">

                {/* Modern Header */}
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${headerColor} shadow-sm`}>
                                <HeaderIcon size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                                    {formData.label as string || typeLabel}
                                </SheetTitle>
                                <p className="text-sm font-medium text-muted-foreground mt-1">
                                    {typeLabel} Configuration
                                </p>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Common Fields */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</Label>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Nombre del Paso</Label>
                            <Input
                                value={(formData.label as string) || ''}
                                onChange={(e) => handleChange('label', e.target.value)}
                                placeholder="ej. Mensaje de Bienvenida"
                                className={`h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-slate-400 ${errors.label ? 'border-red-500 focus-visible:ring-red-500' : ''
                                    }`}
                            />
                            {errors.label && (
                                <p className="text-xs text-red-500 mt-1">{errors.label}</p>
                            )}
                        </div>
                    </div>


                    {/* Billing Node Config */}
                    {node.type === 'billing' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Facturación</Label>

                            <div className="space-y-3">
                                <Label>Acción</Label>
                                <Select
                                    value={(formData.actionType as string) || 'create_invoice'}
                                    onValueChange={(v) => handleChange('actionType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Seleccionar acción" />
                                    </SelectTrigger>
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
                                        <Label>Cliente ID (Lead/Client)</Label>
                                        <Input
                                            value={(formData.clientId as string) || ''}
                                            onChange={(e) => handleChange('clientId', e.target.value)}
                                            placeholder="{{clientId}}"
                                            className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                                        />
                                        <p className="text-[10px] text-muted-foreground">ID del cliente al que se asociará el documento.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Items (JSON Array)</Label>
                                        <Textarea
                                            value={(formData.items as string) || ''}
                                            onChange={(e) => handleChange('items', e.target.value)}
                                            placeholder='[{"description": "Service", "quantity": 1, "unit_price": 100}]'
                                            className="font-mono text-xs bg-slate-50 dark:bg-slate-900 h-24"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Array de objetos con descripción, cantidad y precio unitario.</p>
                                    </div>
                                </div>
                            )}

                            {formData.actionType === 'send_quote' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Quote ID</Label>
                                        <Input
                                            value={(formData.quoteId as string) || ''}
                                            onChange={(e) => handleChange('quoteId', e.target.value)}
                                            placeholder="{{quote_id}}"
                                            className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                                        />
                                        <p className="text-[10px] text-muted-foreground">ID de la cotización a enviar. Usualmente viene de un paso anterior.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notification Node Config */}
                    {node.type === 'notification' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Notificación</Label>

                            <div className="space-y-3">
                                <Label>Tipo</Label>
                                <Select
                                    value={(formData.actionType as string) || 'notify_user'}
                                    onValueChange={(v) => handleChange('actionType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="notify_user">Notificación Interna (Sistema)</SelectItem>
                                        {/* <SelectItem value="notify_email">Notificación por Email</SelectItem> */}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Usuario ID (Opcional)</Label>
                                    <Input
                                        value={(formData.userId as string) || ''}
                                        onChange={(e) => handleChange('userId', e.target.value)}
                                        placeholder="user_..."
                                        className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Si se deja vacío, notifica a los administradores.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Título</Label>
                                    <Input
                                        value={(formData.title as string) || ''}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="Nuevo Lead Asignado"
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mensaje</Label>
                                    <Textarea
                                        value={(formData.message as string) || ''}
                                        onChange={(e) => handleChange('message', e.target.value)}
                                        placeholder="Se ha asignado el lead {{lead.name}} a tu cartera."
                                        rows={3}
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Link de Redirección (Opcional)</Label>
                                    <Input
                                        value={(formData.linkIdx as string) || ''}
                                        onChange={(e) => handleChange('linkIdx', e.target.value)}
                                        placeholder="/crm/inbox/..."
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Variable Node Config */}
                    {node.type === 'variable' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestión de Variables</Label>

                            <div className="space-y-3">
                                <Label>Operación</Label>
                                <Select
                                    value={(formData.actionType as string) || 'set'}
                                    onValueChange={(v) => handleChange('actionType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Seleccionar operación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="set">Establecer Valor (Set)</SelectItem>
                                        <SelectItem value="math">Cálculo Matemático</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Nombre de Variable Destino</Label>
                                    <Input
                                        value={(formData.targetVar as string) || ''}
                                        onChange={(e) => handleChange('targetVar', e.target.value)}
                                        placeholder="score"
                                        className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                                    />
                                    <p className="text-[10px] text-muted-foreground">La variable donde se guardará el resultado (sin llaves).</p>
                                </div>

                                {formData.actionType === 'set' ? (
                                    <div className="space-y-2">
                                        <Label>Valor</Label>
                                        <Input
                                            value={(formData.value as string) || ''}
                                            onChange={(e) => handleChange('value', e.target.value)}
                                            placeholder="100, true, o {{otra_var}}"
                                            className="bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <Input
                                                value={(formData.operand1 as string) || ''}
                                                onChange={(e) => handleChange('operand1', e.target.value)}
                                                placeholder="Op 1"
                                                className="font-mono text-sm"
                                            />
                                            <Select
                                                value={(formData.operator as string) || 'add'}
                                                onValueChange={(v) => handleChange('operator', v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="add">+</SelectItem>
                                                    <SelectItem value="sub">-</SelectItem>
                                                    <SelectItem value="mult">*</SelectItem>
                                                    <SelectItem value="div">/</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                value={(formData.operand2 as string) || ''}
                                                onChange={(e) => handleChange('operand2', e.target.value)}
                                                placeholder="Op 2"
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-center">Ej: <code>{`{{ score }}`} + 10</code></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {node.type === 'trigger' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Trigger</Label>

                            <div className="space-y-3">
                                <Label>Tipo de Disparador</Label>
                                <Select
                                    value={(formData.triggerType as string) || 'webhook'}
                                    onValueChange={(v) => handleChange('triggerType', v)}
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
                                        <SelectItem value="schedule" disabled>⏰ Programado (Próximamente)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {formData.triggerType === 'first_contact'
                                        ? '🎯 Solo se dispara cuando un lead nuevo escribe por primera vez.'
                                        : formData.triggerType === 'keyword'
                                            ? '🔍 Solo se dispara cuando el mensaje contiene la palabra clave.'
                                            : formData.triggerType === 'business_hours'
                                                ? '🏢 Solo se dispara durante el horario laboral configurado.'
                                                : formData.triggerType === 'outside_hours'
                                                    ? '🌙 Se dispara cuando el mensaje llega fuera del horario de oficina.'
                                                    : formData.triggerType === 'media_received'
                                                        ? '📸 Se dispara cuando el usuario envía una imagen, video, audio o documento.'
                                                        : '📬 Se dispara con cualquier mensaje entrante.'
                                    }
                                </p>
                            </div>

                            {(formData.triggerType === 'webhook' || formData.triggerType === 'first_contact' || formData.triggerType === 'keyword') && (
                                <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                    <div className="space-y-2">
                                        <Label>Canal</Label>
                                        <div className="space-y-2">
                                            <Label>Canales Activos</Label>
                                            <ChannelSelector
                                                multiple={true}
                                                value={(formData.channels as string[]) || (formData.channel ? [formData.channel] : [])}
                                                onChange={(val) => {
                                                    handleChange('channels', val);
                                                    // Sync legacy field for backward compatibility if needed, or just clear it
                                                    if (Array.isArray(val) && val.length > 0) {
                                                        handleChange('channel', val[0]);
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground pt-1">
                                                Selecciona uno o más canales donde este workflow escuchará mensajes.
                                            </p>
                                        </div>
                                    </div>

                                    {formData.triggerType === 'keyword' && (
                                        <div className="space-y-2">
                                            <Label>Palabra Clave</Label>
                                            <Input
                                                value={(formData.keyword as string) || ''}
                                                onChange={(e) => handleChange('keyword', e.target.value)}
                                                placeholder="ej. info, precios, hola"
                                                className="bg-white dark:bg-slate-900"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                El workflow se dispara cuando el mensaje <strong>contiene</strong> esta palabra.
                                            </p>
                                        </div>
                                    )}

                                    {/* Cooldown Setting */}
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
                                                onChange={(e) => handleChange('cooldown_minutes', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-24 bg-white dark:bg-slate-900"
                                            />
                                            <span className="text-sm text-muted-foreground">minutos</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Evita disparar el mismo workflow para el mismo lead dentro de este tiempo. Déjalo en 0 para desactivar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Business Hours Configuration */}
                            {(formData.triggerType === 'business_hours' || formData.triggerType === 'outside_hours') && (
                                <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <Clock className="h-4 w-4" />
                                        <Label className="text-sm font-semibold">Configuración de Horario</Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Hora Inicio</Label>
                                            <Select
                                                value={String((formData.start_hour as number) ?? 9)}
                                                onValueChange={(v) => handleChange('start_hour', parseInt(v))}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Hora Fin</Label>
                                            <Select
                                                value={String((formData.end_hour as number) ?? 18)}
                                                onValueChange={(v) => handleChange('end_hour', parseInt(v))}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {formData.triggerType === 'business_hours'
                                            ? 'El workflow solo se dispara durante este horario (Lunes a Viernes por defecto).'
                                            : 'El workflow se dispara FUERA de este horario (ideal para mensajes automáticos de "fuera de oficina").'
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Media Received Configuration */}
                            {formData.triggerType === 'media_received' && (
                                <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/50">
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                        <Box className="h-4 w-4" />
                                        <Label className="text-sm font-semibold">Tipos de Media</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Este trigger se dispara cuando el usuario envía: imágenes, videos, audios, documentos, stickers o ubicaciones.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {node.type === 'action' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Acción</Label>

                            <div className="space-y-3">
                                <Label>Tipo de Acción</Label>
                                <Select
                                    value={(formData.actionType as string) || 'send_message'}
                                    onValueChange={(v) => handleChange('actionType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Seleccionar acción" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="send_message">Send Message</SelectItem>
                                        <SelectItem value="add_tag">Add Tag to Lead</SelectItem>
                                        <SelectItem value="assign_user">Assign Team Member</SelectItem>
                                        <SelectItem value="update_status">Update Deal Stage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.actionType === 'send_message' ? (
                                <div className="space-y-4">
                                    {/* Header Config */}
                                    <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">

                                        {/* Media Header (Optional) */}
                                        <div className="space-y-3">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase">Multimedia (Opcional)</Label>
                                            <Select
                                                value={(formData.headerMediaType as string) || 'none'}
                                                onValueChange={(v) => handleChange('headerMediaType', v)}
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
                                                        handleChange('headerMediaUrl', url)
                                                        handleChange('headerMediaMime', type) // Store mime type
                                                        handleChange('headerMediaName', name)
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

                                        {/* Title (Text Header) (Optional) */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-semibold text-slate-500 uppercase">Título (Negrita)</Label>
                                                {/* Optional: Add variable picker trigger here if needed */}
                                            </div>
                                            <Input
                                                value={(formData.headerText as string) || ''}
                                                onChange={(e) => handleChange('headerText', e.target.value)}
                                                placeholder="Ej: ¡Bienvenido a Pixy!"
                                                className="bg-white dark:bg-slate-900 font-bold"
                                            />
                                        </div>

                                    </div>

                                    {/* Body Config */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Cuerpo del Mensaje</Label>
                                            <VariableSelector onSelect={(v) => {
                                                const textarea = document.getElementById('message-body-textarea') as HTMLTextAreaElement;
                                                if (textarea) {
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const text = (formData.message as string) || '';
                                                    const newText = text.substring(0, start) + v + text.substring(end);
                                                    handleChange('message', newText);
                                                    // Defer focus back to textarea
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + v.length, start + v.length);
                                                    }, 0);
                                                } else {
                                                    handleChange('message', (formData.message as string || '') + v);
                                                }
                                            }}>
                                                <span className="text-xs text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                                    <Zap size={10} /> Insert Variable
                                                </span>
                                            </VariableSelector>
                                        </div>
                                        <Textarea
                                            id="message-body-textarea"
                                            value={(formData.message as string) || ''}
                                            onChange={(e) => handleChange('message', e.target.value)}
                                            placeholder="Hello {{lead.name}}, checking in..."
                                            rows={5}
                                            className={`resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${errors.message ? 'border-red-500 focus-visible:ring-red-500' : ''
                                                }`}
                                        />
                                        {errors.message && (
                                            <p className="text-xs text-red-500 mt-1">{errors.message}</p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Tip: You can use Handlebars syntax like {'{{lead.email}}'} to personalize variables.
                                        </p>
                                    </div>

                                    {/* Footer Config */}
                                    <div className="space-y-2">
                                        <Label>Pie de Página (Opcional)</Label>
                                        <Input
                                            value={(formData.footerText as string) || ''}
                                            onChange={(e) => handleChange('footerText', e.target.value)}
                                            placeholder="Texto pequeño en gris"
                                            className="bg-slate-50 dark:bg-slate-900 text-xs"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                    <p className="text-sm text-muted-foreground">Additional configuration for this action type coming soon.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {node.type === 'condition' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reglas Lógicas</Label>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                        <strong>💡 ¿Qué hace esto?</strong> Las condiciones dividen tu flujo en dos caminos: <span className="text-green-600 font-semibold">True</span> (cuando se cumple) y <span className="text-red-600 font-semibold">False</span> (cuando no).
                                    </p>
                                </div>
                            </div>

                            {/* Logic Gate Selector */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Tipo de Lógica</Label>
                                <p className="text-xs text-muted-foreground">ALL (Y) = todas deben cumplirse | ANY (O) = al menos una debe cumplirse</p>
                                <Select
                                    value={(formData.logic as string) || 'ALL'}
                                    onValueChange={(v) => handleChange('logic', v)}
                                >
                                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">✓ Todas las condiciones (AND) - Más estricto</SelectItem>
                                        <SelectItem value="ANY">○ Cualquier condición (OR) - Más flexible</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditions List */}
                            <div className="space-y-4">
                                <Label className="text-sm font-medium">Condiciones a Evaluar</Label>
                                {((formData.conditions as Array<{ variable: string, operator: string, value: string }>) || [{ variable: formData.variable || '', operator: formData.operator || 'equals', value: formData.value || '' }]).map((cond, index) => (
                                    <div key={index} className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Condición {index + 1}</span>
                                            {((formData.conditions as any[])?.length || 1) > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const conditions = (formData.conditions as any[]) || [];
                                                        handleChange('conditions', conditions.filter((_, i) => i !== index));
                                                    }}
                                                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <X size={14} />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Variable */}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Variable</Label>
                                            <Input
                                                value={cond.variable}
                                                onChange={(e) => {
                                                    const conditions = (formData.conditions as any[]) || [{ variable: formData.variable || '', operator: formData.operator || 'equals', value: formData.value || '' }];
                                                    conditions[index] = { ...conditions[index], variable: e.target.value };
                                                    handleChange('conditions', conditions);
                                                }}
                                                placeholder="{{lead.score}}"
                                                className="font-mono text-sm h-9 bg-white dark:bg-slate-950"
                                            />
                                        </div>

                                        {/* Operator & Value */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Operador</Label>
                                                <Select
                                                    value={cond.operator}
                                                    onValueChange={(v) => {
                                                        const conditions = (formData.conditions as any[]) || [{ variable: formData.variable || '', operator: formData.operator || 'equals', value: formData.value || '' }];
                                                        conditions[index] = { ...conditions[index], operator: v };
                                                        handleChange('conditions', conditions);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 bg-white dark:bg-slate-950">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="==">== Igual</SelectItem>
                                                        <SelectItem value="!=">!= Diferente</SelectItem>
                                                        <SelectItem value=">">{'>'} Mayor</SelectItem>
                                                        <SelectItem value="<">{'<'} Menor</SelectItem>
                                                        <SelectItem value=">=">{'>'}= Mayor/Igual</SelectItem>
                                                        <SelectItem value="<=">{'<'}= Menor/Igual</SelectItem>
                                                        <SelectItem value="contains">Contiene</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">Valor</Label>
                                                <Input
                                                    value={cond.value}
                                                    onChange={(e) => {
                                                        const conditions = (formData.conditions as any[]) || [{ variable: formData.variable || '', operator: formData.operator || 'equals', value: formData.value || '' }];
                                                        conditions[index] = { ...conditions[index], value: e.target.value };
                                                        handleChange('conditions', conditions);
                                                    }}
                                                    placeholder="100"
                                                    className="h-9 bg-white dark:bg-slate-950"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Condition Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const conditions = (formData.conditions as any[]) || [{ variable: formData.variable || '', operator: formData.operator || 'equals', value: formData.value || '' }];
                                        handleChange('conditions', [...conditions, { variable: '', operator: '==', value: '' }]);
                                    }}
                                    className="w-full h-9 border-dashed"
                                >
                                    <Plus size={14} className="mr-1" />
                                    Añadir Condición
                                </Button>
                            </div>

                            {/* Preview */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs rounded-lg border border-blue-100 dark:border-blue-900/50">
                                <strong>Preview:</strong> Este nodo redirige a <strong>True</strong> o <strong>False</strong> según las condiciones.
                            </div>
                        </div>
                    )}

                    {node.type === 'crm' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de CRM</Label>

                            <div className="space-y-3">
                                <Label>Acción de CRM</Label>
                                <Select
                                    value={(formData.actionType as string) || 'create_lead'}
                                    onValueChange={(v) => handleChange('actionType', v)}
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

                            {formData.actionType === 'create_lead' && (
                                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Nombre del Lead<span className="text-red-500 ml-1">*</span></Label>
                                            <VariableSelector onSelect={(v) => {
                                                const el = document.getElementById('crm-lead-name') as HTMLInputElement;
                                                const current = (formData.leadName as string) || '';
                                                if (el) {
                                                    const start = el.selectionStart || 0;
                                                    const end = el.selectionEnd || 0;
                                                    const newValue = current.substring(0, start) + v + current.substring(end);
                                                    handleChange('leadName', newValue);
                                                    setTimeout(() => {
                                                        el.focus();
                                                        el.setSelectionRange(start + v.length, start + v.length);
                                                    }, 0);
                                                } else {
                                                    handleChange('leadName', current + v);
                                                }
                                            }}>
                                                <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                                    <Zap size={10} /> Insert Variable
                                                </span>
                                            </VariableSelector>
                                        </div>
                                        <Input
                                            id="crm-lead-name"
                                            value={(formData.leadName as string) || ''}
                                            onChange={(e) => handleChange('leadName', e.target.value)}
                                            placeholder="{{message.sender}}"
                                            className="bg-white dark:bg-slate-900 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input
                                                value={(formData.leadEmail as string) || ''}
                                                onChange={(e) => handleChange('leadEmail', e.target.value)}
                                                placeholder="email@example.com"
                                                className="bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teléfono</Label>
                                            <Input
                                                value={(formData.leadPhone as string) || ''}
                                                onChange={(e) => handleChange('leadPhone', e.target.value)}
                                                placeholder="{'{{phone}}'}"
                                                className="bg-white dark:bg-slate-900 font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">Tip: Use {'{{variable}}'} to insert dynamic data from workflow context.</p>
                                </div>
                            )}

                            {formData.actionType === 'update_stage' && (
                                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                    <div className="space-y-2">
                                        <Label>Lead ID<span className="text-red-500 ml-1">*</span></Label>
                                        <Input
                                            value={(formData.leadId as string) || ''}
                                            onChange={(e) => handleChange('leadId', e.target.value)}
                                            placeholder="{'{{leadId}}'}"
                                            className="bg-white dark:bg-slate-900 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ID de Nueva Etapa<span className="text-red-500 ml-1">*</span></Label>
                                        <Input
                                            value={(formData.newStageId as string) || ''}
                                            onChange={(e) => handleChange('newStageId', e.target.value)}
                                            placeholder="stage-uuid"
                                            className="bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.actionType === 'add_tag' && (
                                <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                    <div className="space-y-2">
                                        <Label>Lead ID<span className="text-red-500 ml-1">*</span></Label>
                                        <Input
                                            value={(formData.leadId as string) || ''}
                                            onChange={(e) => handleChange('leadId', e.target.value)}
                                            placeholder="{'{{leadId}}'}"
                                            className="bg-white dark:bg-slate-900 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nombre de Etiqueta<span className="text-red-500 ml-1">*</span></Label>
                                        <Input
                                            value={(formData.tagName as string) || ''}
                                            onChange={(e) => handleChange('tagName', e.target.value)}
                                            placeholder="bot-qualified"
                                            className="bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {node.type === 'http' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración HTTP</Label>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Método<span className="text-red-500 ml-1">*</span></Label>
                                    <Select
                                        value={(formData.method as string) || 'GET'}
                                        onValueChange={(v) => handleChange('method', v)}
                                    >
                                        <SelectTrigger className={`h-10 bg-slate-50 dark:bg-slate-900 ${errors.method ? 'border-red-500' : ''
                                            }`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GET">GET</SelectItem>
                                            <SelectItem value="POST">POST</SelectItem>
                                            <SelectItem value="PUT">PUT</SelectItem>
                                            <SelectItem value="PATCH">PATCH</SelectItem>
                                            <SelectItem value="DELETE">DELETE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.method && (
                                        <p className="text-xs text-red-500">{errors.method}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Timeout (ms)</Label>
                                    <Input
                                        type="number"
                                        value={(formData.timeout as number) || 30000}
                                        onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
                                        placeholder="30000"
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>URL<span className="text-red-500 ml-1">*</span></Label>
                                <Input
                                    value={(formData.url as string) || ''}
                                    onChange={(e) => handleChange('url', e.target.value)}
                                    placeholder="https://api.example.com/endpoint"
                                    className={`bg-slate-50 dark:bg-slate-900 ${errors.url ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.url && (
                                    <p className="text-xs text-red-500">{errors.url}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Soporta variables: {'{{context.variable}}'}</p>
                            </div>

                            {['POST', 'PUT', 'PATCH'].includes((formData.method as string) || '') && (
                                <div className="space-y-2">
                                    <Label>Body (JSON)</Label>
                                    <Textarea
                                        value={(formData.body as string) || ''}
                                        onChange={(e) => handleChange('body', e.target.value)}
                                        placeholder='{"key": "{{value}}"}'
                                        rows={4}
                                        className="resize-none bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {node.type === 'email' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Email</Label>

                            <div className="space-y-2">
                                <Label>Destinatario (To)<span className="text-red-500 ml-1">*</span></Label>
                                <Input
                                    value={(formData.to as string) || ''}
                                    onChange={(e) => handleChange('to', e.target.value)}
                                    placeholder="{{lead.email}}"
                                    className={`bg-slate-50 dark:bg-slate-900 ${errors.to ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.to && (
                                    <p className="text-xs text-red-500">{errors.to}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Soporta variables: {'{{context.email}}'}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Asunto<span className="text-red-500 ml-1">*</span></Label>
                                    <VariableSelector onSelect={(v) => {
                                        const el = document.getElementById('email-subject') as HTMLInputElement;
                                        const current = (formData.subject as string) || '';
                                        if (el) {
                                            const start = el.selectionStart || 0;
                                            const end = el.selectionEnd || 0;
                                            const newValue = current.substring(0, start) + v + current.substring(end);
                                            handleChange('subject', newValue);
                                            setTimeout(() => {
                                                el.focus();
                                                el.setSelectionRange(start + v.length, start + v.length);
                                            }, 0);
                                        } else {
                                            handleChange('subject', current + v);
                                        }
                                    }}>
                                        <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                            <Zap size={10} /> Insert Var
                                        </span>
                                    </VariableSelector>
                                </div>
                                <Input
                                    id="email-subject"
                                    value={(formData.subject as string) || ''}
                                    onChange={(e) => handleChange('subject', e.target.value)}
                                    placeholder="¡Bienvenido {{lead.name}}!"
                                    className={`bg-slate-50 dark:bg-slate-900 ${errors.subject ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.subject && (
                                    <p className="text-xs text-red-500">{errors.subject}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Cuerpo (HTML)<span className="text-red-500 ml-1">*</span></Label>
                                    <VariableSelector onSelect={(v) => {
                                        const el = document.getElementById('email-body') as HTMLTextAreaElement;
                                        const current = (formData.body as string) || '';
                                        if (el) {
                                            const start = el.selectionStart || 0;
                                            const end = el.selectionEnd || 0;
                                            const newValue = current.substring(0, start) + v + current.substring(end);
                                            handleChange('body', newValue);
                                            setTimeout(() => {
                                                el.focus();
                                                el.setSelectionRange(start + v.length, start + v.length);
                                            }, 0);
                                        } else {
                                            handleChange('body', current + v);
                                        }
                                    }}>
                                        <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                            <Zap size={10} /> Insert Variable
                                        </span>
                                    </VariableSelector>
                                </div>
                                <Textarea
                                    id="email-body"
                                    value={(formData.body as string) || ''}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    placeholder='<h1>Hola {{lead.name}}</h1><p>Gracias por registrarte.</p>'
                                    rows={6}
                                    className={`resize-none bg-slate-50 dark:bg-slate-900 font-mono text-sm ${errors.body ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.body && (
                                    <p className="text-xs text-red-500">{errors.body}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Soporta HTML y variables</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Reply-To (opcional)</Label>
                                <Input
                                    value={(formData.replyTo as string) || ''}
                                    onChange={(e) => handleChange('replyTo', e.target.value)}
                                    placeholder="support@company.com"
                                    className="bg-slate-50 dark:bg-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {node.type === 'sms' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración SMS</Label>

                            <div className="space-y-2">
                                <Label>Número (To)<span className="text-red-500 ml-1">*</span></Label>
                                <Input
                                    value={(formData.to as string) || ''}
                                    onChange={(e) => handleChange('to', e.target.value)}
                                    placeholder="+1234567890 o {{lead.phone}}"
                                    className={`bg-slate-50 dark:bg-slate-900 ${errors.to ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.to && (
                                    <p className="text-xs text-red-500">{errors.to}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Formato internacional: +[código país][número]</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Mensaje<span className="text-red-500 ml-1">*</span></Label>
                                    <div className="flex items-center gap-3">
                                        <VariableSelector onSelect={(v) => {
                                            const el = document.getElementById('sms-body') as HTMLTextAreaElement;
                                            const current = (formData.body as string) || '';
                                            if (el) {
                                                const start = el.selectionStart || 0;
                                                const end = el.selectionEnd || 0;
                                                const newValue = current.substring(0, start) + v + current.substring(end);
                                                handleChange('body', newValue);
                                                setTimeout(() => {
                                                    el.focus();
                                                    el.setSelectionRange(start + v.length, start + v.length);
                                                }, 0);
                                            } else {
                                                handleChange('body', current + v);
                                            }
                                        }}>
                                            <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                                <Zap size={10} /> Variable
                                            </span>
                                        </VariableSelector>
                                        <span className="text-xs text-muted-foreground">
                                            {((formData.body as string) || '').length}/160
                                        </span>
                                    </div>
                                </div>
                                <Textarea
                                    id="sms-body"
                                    value={(formData.body as string) || ''}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    placeholder='Hola {{lead.name}}, confirmamos tu cita para mañana.'
                                    rows={4}
                                    maxLength={160}
                                    className={`resize-none bg-slate-50 dark:bg-slate-900 ${errors.body ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.body && (
                                    <p className="text-xs text-red-500">{errors.body}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Soporta variables. Máximo 160 caracteres para SMS estándar.</p>
                            </div>
                        </div>
                    )}

                    {node.type === 'ab_test' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración de Split</Label>
                                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                                    <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                                        <strong>🧪 Experimentos A/B:</strong> Divide el tráfico aleatoriamente entre múltiples caminos para probar qué variante funciona mejor.
                                    </p>
                                </div>
                            </div>

                            {/* Paths Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Variantes (Caminos)</Label>
                                    {/* Calculated Total */}
                                    <div className={`text-xs px-2 py-1 rounded font-mono ${((formData.paths as any[]) || [{ percentage: 50 }, { percentage: 50 }]).reduce((acc, p) => acc + (parseInt(p.percentage) || 0), 0) === 100
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold'
                                        }`}>
                                        Total: {((formData.paths as any[]) || [{ percentage: 50 }, { percentage: 50 }]).reduce((acc, p) => acc + (parseInt(p.percentage) || 0), 0)}%
                                    </div>
                                </div>

                                {((formData.paths as Array<{ id: string, label: string, percentage: number }>) || [
                                    { id: 'a', label: 'Path A', percentage: 50 },
                                    { id: 'b', label: 'Path B', percentage: 50 }
                                ]).map((path, index) => (
                                    <div key={index} className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 space-y-3 hover:border-orange-300 dark:hover:border-orange-800 transition-all">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Variante {String.fromCharCode(65 + index)}</span>
                                            {((formData.paths as any[])?.length || 2) > 2 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const paths = (formData.paths as any[]) || [];
                                                        handleChange('paths', paths.filter((_, i) => i !== index));
                                                    }}
                                                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <X size={14} />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Label */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">Nombre</Label>
                                                <Input
                                                    value={path.label}
                                                    onChange={(e) => {
                                                        const paths = (formData.paths as any[]) || getAbTestDefaults();
                                                        paths[index] = { ...paths[index], label: e.target.value };
                                                        handleChange('paths', paths);
                                                    }}
                                                    placeholder={`Variante ${String.fromCharCode(65 + index)}`}
                                                    className="h-9 bg-white dark:bg-slate-950"
                                                />
                                            </div>

                                            {/* Percentage */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">Porcentaje (%)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={path.percentage}
                                                        onChange={(e) => {
                                                            const paths = (formData.paths as any[]) || getAbTestDefaults();
                                                            paths[index] = { ...paths[index], percentage: parseInt(e.target.value) || 0 };
                                                            handleChange('paths', paths);
                                                        }}
                                                        className="h-9 bg-white dark:bg-slate-950 pr-8"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Path Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const paths = (formData.paths as any[]) || getAbTestDefaults();
                                        handleChange('paths', [...paths, {
                                            id: Math.random().toString(36).substr(2, 9),
                                            label: `Variante ${String.fromCharCode(65 + paths.length)}`,
                                            percentage: 0
                                        }]);
                                    }}
                                    className="w-full h-9 border-dashed"
                                >
                                    <Plus size={14} className="mr-1" />
                                    Añadir Variante
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* AI Agent Configuration */}
                    {node.type === 'ai_agent' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Agente IA
                            </Label>

                            <div className="space-y-3">
                                <Label>Modelo AI</Label>
                                <Select
                                    value={(formData.model as string) || 'gpt-4o'}
                                    onValueChange={(v) => handleChange('model', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                        <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>System Prompt (Instrucciones)</Label>
                                <Textarea
                                    value={(formData.systemPrompt as string) || ''}
                                    onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                    placeholder="Eres un asistente experto en..."
                                    rows={3}
                                    className="resize-none bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>User Prompt (Input)</Label>
                                <Textarea
                                    value={(formData.userPrompt as string) || ''}
                                    onChange={(e) => handleChange('userPrompt', e.target.value)}
                                    placeholder="Analiza este lead: {{lead.summary}}"
                                    rows={5}
                                    className="resize-none bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Usa variables como {'{{lead.name}}'} para contexto dinámico.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Creatividad (Temperatura)</Label>
                                    <span className="text-xs text-muted-foreground">{(formData.temperature as number) || 0.7}</span>
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={(formData.temperature as number) || 0.7}
                                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                    className="bg-slate-50 dark:bg-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Wait/Delay Node Configuration */}
                    {node.type === 'wait' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Espera
                            </Label>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Duración</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={(formData.duration as number) || 1}
                                        onChange={(e) => handleChange('duration', parseInt(e.target.value) || 1)}
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidad</Label>
                                    <Select
                                        value={(formData.unit as string) || 'minutes'}
                                        onValueChange={(v) => handleChange('unit', v)}
                                    >
                                        <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="seconds">Segundos</SelectItem>
                                            <SelectItem value="minutes">Minutos</SelectItem>
                                            <SelectItem value="hours">Horas</SelectItem>
                                            <SelectItem value="days">Días</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Buttons Node Configuration */}
                    {node.type === 'buttons' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Mensaje Interactivo
                            </Label>

                            <div className="space-y-3">
                                <Label>Tipo de Mensaje</Label>
                                <Select
                                    value={(formData.messageType as string) || 'buttons'}
                                    onValueChange={(v) => handleChange('messageType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="buttons">Botones Simples (Max 3)</SelectItem>
                                        <SelectItem value="list">Lista de Opciones (Max 10)</SelectItem>
                                        <SelectItem value="cta">Llamada a la Acción (URL/Tel)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Cuerpo del Mensaje<span className="text-red-500 ml-1">*</span></Label>
                                    <VariableSelector onSelect={(v) => {
                                        const el = document.getElementById('buttons-body') as HTMLTextAreaElement;
                                        const current = (formData.body as string) || '';
                                        if (el) {
                                            const start = el.selectionStart || 0;
                                            const end = el.selectionEnd || 0;
                                            const newValue = current.substring(0, start) + v + current.substring(end);
                                            handleChange('body', newValue);
                                            setTimeout(() => {
                                                el.focus();
                                                el.setSelectionRange(start + v.length, start + v.length);
                                            }, 0);
                                        } else {
                                            handleChange('body', current + v);
                                        }
                                    }}>
                                        <span className="text-[10px] text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
                                            <Zap size={10} /> Insert Variable
                                        </span>
                                    </VariableSelector>
                                </div>
                                <Textarea
                                    id="buttons-body"
                                    value={(formData.body as string) || ''}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    placeholder="Selecciona una opción del menú..."
                                    rows={4}
                                    className="resize-none bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">Soporta variables {'{{...}}'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Encabezado (Opcional)</Label>
                                    <Input
                                        value={(formData.header as any)?.content || (formData.header as string) || ''}
                                        onChange={(e) => handleChange('header', { type: 'text', content: e.target.value })}
                                        placeholder="Negrita superior"
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pie de página (Opcional)</Label>
                                    <Input
                                        value={(formData.footer as string) || ''}
                                        onChange={(e) => handleChange('footer', e.target.value)}
                                        placeholder="Texto gris pequeño"
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                {/* Buttons Configuration (Reply Only) */}
                                {formData.messageType === 'buttons' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <Label>Opciones (Botones)</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {((formData.buttons as any[]) || []).length} / 3
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            Botones de respuesta rápida para continuar el flujo.
                                        </p>

                                        {((formData.buttons as Array<{ id: string, title: string }>) || []).map((btn, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <div className="grid grid-cols-[1fr,auto] gap-2 flex-1">
                                                    <Input
                                                        value={btn.title}
                                                        onChange={(e) => {
                                                            const buttons = (formData.buttons as any[]) || [];
                                                            buttons[index] = { ...buttons[index], title: e.target.value };
                                                            handleChange('buttons', buttons);
                                                        }}
                                                        placeholder={`Opción ${index + 1}`}
                                                        className="h-9 bg-white dark:bg-slate-950"
                                                    />
                                                    <div className="h-9 px-3 flex items-center justify-center bg-slate-100 rounded text-xs font-mono text-slate-500">
                                                        {btn.id}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const buttons = (formData.buttons as any[]) || [];
                                                        handleChange('buttons', buttons.filter((_, i) => i !== index));
                                                    }}
                                                    className="h-9 w-9 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const buttons = (formData.buttons as any[]) || [];
                                                if (buttons.length >= 3) {
                                                    toast.error(`Máximo 3 opciones permitidas`);
                                                    return;
                                                }
                                                const newId = `btn_${Math.random().toString(36).substr(2, 5)}`;
                                                handleChange('buttons', [...buttons, { id: newId, title: '' }]);
                                            }}
                                            className="w-full border-dashed"
                                        >
                                            <Plus size={14} className="mr-2" />
                                            Agregar Botón
                                        </Button>
                                    </>
                                )}

                                {/* List Configuration */}
                                {formData.messageType === 'list' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Texto del Botón de Menú</Label>
                                            <Input
                                                value={(formData.listButtonText as string) || ''}
                                                onChange={(e) => handleChange('listButtonText', e.target.value)}
                                                placeholder="Ej: Ver Opciones"
                                                className="bg-slate-50 dark:bg-slate-900"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <Label>Secciones de la Lista</Label>
                                        </div>

                                        {((formData.sections as Array<{ title?: string, rows: Array<{ id: string, title: string, description?: string }> }>) || []).map((section, sIdx) => (
                                            <div key={sIdx} className="border rounded-lg p-3 space-y-3 bg-slate-50/50">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={section.title || ''}
                                                        onChange={(e) => {
                                                            const sections = (formData.sections as any[]) || [];
                                                            sections[sIdx] = { ...sections[sIdx], title: e.target.value };
                                                            handleChange('sections', sections);
                                                        }}
                                                        placeholder="Título de Sección (Requerido)"
                                                        className={`h-8 font-semibold ${errors.sections ? 'border-red-500' : ''}`}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const sections = (formData.sections as any[]) || [];
                                                            handleChange('sections', sections.filter((_, i) => i !== sIdx));
                                                        }}
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>

                                                <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                                                    {section.rows.map((row, rIdx) => (
                                                        <div key={rIdx} className="grid grid-cols-[1fr,auto] gap-2 items-start">
                                                            <div className="space-y-1">
                                                                <Input
                                                                    value={row.title}
                                                                    onChange={(e) => {
                                                                        const sections = (formData.sections as any[]) || [];
                                                                        sections[sIdx].rows[rIdx].title = e.target.value;
                                                                        handleChange('sections', sections);
                                                                    }}
                                                                    placeholder="Título de opción"
                                                                    className="h-8 text-sm"
                                                                />
                                                                <Input
                                                                    value={row.description || ''}
                                                                    onChange={(e) => {
                                                                        const sections = (formData.sections as any[]) || [];
                                                                        sections[sIdx].rows[rIdx].description = e.target.value;
                                                                        handleChange('sections', sections);
                                                                    }}
                                                                    placeholder="Descripción (opcional)"
                                                                    className="h-7 text-xs text-muted-foreground"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <div className="h-7 px-2 flex items-center justify-center bg-slate-100 rounded text-[10px] font-mono text-slate-500">
                                                                    {row.id}
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        const sections = (formData.sections as any[]) || [];
                                                                        sections[sIdx].rows = section.rows.filter((_, i) => i !== rIdx);
                                                                        handleChange('sections', sections);
                                                                    }}
                                                                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const sections = (formData.sections as any[]) || [];
                                                            const newId = `row_${Math.random().toString(36).substr(2, 5)}`;
                                                            sections[sIdx].rows.push({ id: newId, title: '', description: '' });
                                                            handleChange('sections', sections);
                                                        }}
                                                        className="w-full h-8 text-xs border-dashed border"
                                                    >
                                                        <Plus size={12} className="mr-2" />
                                                        Agregar Opción a Sección
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const sections = (formData.sections as any[]) || [];
                                                if (sections.length >= 10) {
                                                    toast.error(`Máximo 10 secciones permitidas`);
                                                    return;
                                                }
                                                handleChange('sections', [...sections, { title: '', rows: [] }]);
                                            }}
                                            className="w-full border-dashed"
                                        >
                                            <Plus size={14} className="mr-2" />
                                            Agregar Nueva Sección
                                        </Button>
                                    </>
                                )}

                                {/* CTA Configuration */}
                                {formData.messageType === 'cta' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <Label>Botones de Acción</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {((formData.ctaButtons as any[]) || []).length} / 2
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            Soporta enlaces (URL) y números de teléfono.
                                        </p>

                                        {((formData.ctaButtons as Array<{ type: 'url' | 'phone', text: string, value: string }>) || []).map((btn, index) => (
                                            <div key={index} className="p-3 border rounded-lg bg-slate-50/50 space-y-3 relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const ctaButtons = (formData.ctaButtons as any[]) || [];
                                                        handleChange('ctaButtons', ctaButtons.filter((_, i) => i !== index));
                                                    }}
                                                    className="absolute right-2 top-2 h-6 w-6 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Tipo de Acción</Label>
                                                    <Select
                                                        value={btn.type}
                                                        onValueChange={(v) => {
                                                            const ctaButtons = (formData.ctaButtons as any[]) || [];
                                                            ctaButtons[index] = { ...ctaButtons[index], type: v };
                                                            handleChange('ctaButtons', ctaButtons);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 bg-white dark:bg-slate-950">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="url">Abrir Sitio Web (URL)</SelectItem>
                                                            <SelectItem value="phone">Llamar Teléfono</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Texto del Botón</Label>
                                                    <Input
                                                        value={btn.text}
                                                        onChange={(e) => {
                                                            const ctaButtons = (formData.ctaButtons as any[]) || [];
                                                            ctaButtons[index] = { ...ctaButtons[index], text: e.target.value };
                                                            handleChange('ctaButtons', ctaButtons);
                                                        }}
                                                        placeholder="Ej: Visitar Web"
                                                        className="h-8 bg-white dark:bg-slate-950"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">{btn.type === 'url' ? 'URL (Enlace)' : 'Número de Teléfono'}</Label>
                                                    <Input
                                                        value={btn.value}
                                                        onChange={(e) => {
                                                            const ctaButtons = (formData.ctaButtons as any[]) || [];
                                                            ctaButtons[index] = { ...ctaButtons[index], value: e.target.value };
                                                            handleChange('ctaButtons', ctaButtons);
                                                        }}
                                                        placeholder={btn.type === 'url' ? 'https://example.com' : '+573001234567'}
                                                        className="h-8 bg-white dark:bg-slate-950 font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const ctaButtons = (formData.ctaButtons as any[]) || [];
                                                if (ctaButtons.length >= 2) {
                                                    toast.error(`Máximo 2 botones permitidos`);
                                                    return;
                                                }
                                                handleChange('ctaButtons', [...ctaButtons, { type: 'url', text: '', value: '' }]);
                                            }}
                                            className="w-full border-dashed"
                                        >
                                            <Plus size={14} className="mr-2" />
                                            Agregar Botón CTA
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Wait Input Configuration */}
                    {node.type === 'wait_input' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Espera
                            </Label>

                            <div className="space-y-3">
                                <Label>Tipo de Respuesta Esperada</Label>
                                <Select
                                    value={(formData.inputType as string) || 'any'}
                                    onValueChange={(v) => handleChange('inputType', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Cualquier Respuesta</SelectItem>
                                        <SelectItem value="text">Solo Texto</SelectItem>
                                        <SelectItem value="button_click">Clic en Botón (Interactivo)</SelectItem>
                                        <SelectItem value="image">Imagen / Foto</SelectItem>
                                        <SelectItem value="location">Ubicación</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Guardar Respuesta en Variable</Label>
                                <div className="relative">
                                    <Input
                                        value={(formData.storeAs as string) || ''}
                                        onChange={(e) => handleChange('storeAs', e.target.value)}
                                        placeholder="ej. respuesta_cliente"
                                        className="bg-slate-50 dark:bg-slate-900 pl-9"
                                    />
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">{'{{'}</span>
                                    <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">{'}}'}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Podrás usar esta variable en pasos siguientes como {'{{respuesta_cliente}}'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tiempo Máximo (Timeout)</Label>
                                    <Input
                                        value={(formData.timeout as string) || '1h'}
                                        onChange={(e) => handleChange('timeout', e.target.value)}
                                        placeholder="ej. 30m, 1h, 24h"
                                        className={`bg-slate-50 dark:bg-slate-900 ${errors.timeout ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.timeout && (
                                        <p className="text-[10px] text-red-500 mt-1">{errors.timeout}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Acción al Expirar</Label>
                                    <Select
                                        value={(formData.timeoutAction as string) || 'continue'}
                                        onValueChange={(v) => handleChange('timeoutAction', v)}
                                    >
                                        <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="continue">Continuar flujo</SelectItem>
                                            <SelectItem value="branch">Branch (Camino alternativo)</SelectItem>
                                            <SelectItem value="stop">Detener workflow</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Validation Settings */}
                            <div className="space-y-3 pt-2">
                                <Label className="text-sm font-medium">Validación de Entrada (Opcional)</Label>
                                <Select
                                    value={(formData.validation as any)?.type || 'any'}
                                    onValueChange={(v) => {
                                        if (v === 'any') {
                                            handleChange('validation', undefined);
                                        } else {
                                            handleChange('validation', { type: v, errorMessage: (formData.validation as any)?.errorMessage || 'Entrada inválida' });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Sin validación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Sin validación (aceptar todo)</SelectItem>
                                        <SelectItem value="email">Formato Email</SelectItem>
                                        <SelectItem value="phone">Formato Teléfono</SelectItem>
                                        <SelectItem value="number">Solo Números</SelectItem>
                                        <SelectItem value="regex">Expresión Regular (Regex)</SelectItem>
                                        <SelectItem value="contains">Debe contener texto...</SelectItem>
                                    </SelectContent>
                                </Select>

                                {formData.validation && (formData.validation as any).type !== 'any' && (
                                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                                        {['regex', 'contains'].includes((formData.validation as any).type) && (
                                            <div className="space-y-1">
                                                <Label className="text-xs">Patrón / Texto a buscar</Label>
                                                <Input
                                                    value={(formData.validation as any).value || ''}
                                                    onChange={(e) => handleChange('validation', { ...formData.validation as any, value: e.target.value })}
                                                    placeholder={(formData.validation as any).type === 'regex' ? '^\\d{4}$' : 'hola'}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Mensaje de Error (si falla)</Label>
                                            <Input
                                                value={(formData.validation as any).errorMessage || ''}
                                                onChange={(e) => handleChange('validation', { ...formData.validation as any, errorMessage: e.target.value })}
                                                placeholder="Ej: Introduce un email válido"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Keyword Branching (Branches) */}
                            {['text', 'any'].includes(formData.inputType as string) && (
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Ramificación por Palabras Clave</Label>
                                        <span className="text-[10px] text-muted-foreground uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Opcional</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Reconoce palabras en el texto para seguir caminos distintos.
                                    </p>

                                    {((formData.keywordBranches as Array<{ keyword: string, branchId: string, matchType: 'exact' | 'contains' }>) || []).map((kb, idx) => (
                                        <div key={idx} className="p-3 border rounded-lg bg-white dark:bg-slate-950 space-y-3 shadow-sm relative group">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    const branches = (formData.keywordBranches as any[]) || [];
                                                    handleChange('keywordBranches', branches.filter((_, i) => i !== idx));
                                                }}
                                                className="absolute right-2 top-2 h-6 w-6 text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </Button>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-muted-foreground">Palabra Clave</Label>
                                                    <Input
                                                        value={kb.keyword}
                                                        onChange={(e) => {
                                                            const branches = (formData.keywordBranches as any[]) || [];
                                                            branches[idx] = { ...branches[idx], keyword: e.target.value };
                                                            handleChange('keywordBranches', branches);
                                                        }}
                                                        placeholder="Hlar / Precio"
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-muted-foreground">Coincidencia</Label>
                                                    <Select
                                                        value={kb.matchType}
                                                        onValueChange={(v) => {
                                                            const branches = (formData.keywordBranches as any[]) || [];
                                                            branches[idx] = { ...branches[idx], matchType: v as any };
                                                            handleChange('keywordBranches', branches);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-900">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="exact">Exacta</SelectItem>
                                                            <SelectItem value="contains">Contiene</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase text-muted-foreground">Handle de Salida (ID)</Label>
                                                <div className="flex gap-2 items-center">
                                                    <Input
                                                        value={kb.branchId}
                                                        onChange={(e) => {
                                                            const branches = (formData.keywordBranches as any[]) || [];
                                                            branches[idx] = { ...branches[idx], branchId: e.target.value };
                                                            handleChange('keywordBranches', branches);
                                                        }}
                                                        placeholder="custom_output"
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap italic">← Usa este ID en un handle</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const branches = (formData.keywordBranches as any[]) || [];
                                            const newId = `branch_${Math.random().toString(36).substr(2, 5)}`;
                                            handleChange('keywordBranches', [...branches, { keyword: '', branchId: newId, matchType: 'exact' }]);
                                        }}
                                        className="w-full border-dashed h-9"
                                    >
                                        <Plus size={14} className="mr-2" />
                                        Agregar Rama por Palabra Clave
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tag Node Configuration */}
                    {node.type === 'tag' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Etiqueta
                            </Label>

                            <div className="space-y-3">
                                <Label>Acción</Label>
                                <Select
                                    value={(formData.action as string) || 'add'}
                                    onValueChange={(v) => handleChange('action', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add">Añadir Etiqueta</SelectItem>
                                        <SelectItem value="remove">Quitar Etiqueta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Nombre de la Etiqueta</Label>
                                <Input
                                    value={(formData.tagName as string) || ''}
                                    onChange={(e) => handleChange('tagName', e.target.value)}
                                    placeholder="Ej. Interesado, VIP"
                                    className="bg-slate-50 dark:bg-slate-900"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Escribe el nombre exacto de la etiqueta. Si no existe, se creará automáticamente en "Añadir".
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stage Node Configuration */}
                    {node.type === 'stage' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Configuración de Etapa (Pipeline)
                            </Label>

                            <div className="space-y-3">
                                <Label>Mover a Etapa</Label>
                                <Select
                                    value={(formData.status as string) || ''}
                                    onValueChange={(v) => handleChange('status', v)}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900">
                                        <SelectValue placeholder="Seleccionar etapa..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.length > 0 ? (
                                            stages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.status_key || stage.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${stage.color || 'bg-slate-400'}`} />
                                                        {stage.name}
                                                    </div>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                Cargando etapas...
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm mt-auto">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {onDelete && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={onDelete}
                                    className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950 dark:hover:border-red-900 transition-colors"
                                    title="Eliminar Paso"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            )}
                            {onDuplicate && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={onDuplicate}
                                    className="h-9 w-9 text-slate-500 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 dark:hover:border-blue-900 transition-colors"
                                    title="Duplicar Paso"
                                >
                                    <Copy size={16} />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                                <Check className="h-4 w-4 mr-2" />
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent >
        </Sheet >
    );
}

