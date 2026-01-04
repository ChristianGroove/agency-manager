import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Node } from '@xyflow/react';
import { Trash2, Copy, Zap, Box, Settings2, X, Check, Database, Globe, Mail, MessageSquare, Plus, AlertCircle } from 'lucide-react';
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

    useEffect(() => {
        if (node) {
            setFormData(node.data || {});
        }
    }, [node]);

    const handleChange = (key: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        // Clear error when user starts typing
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        if (!node) return true; // Guard clause

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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) {
            const errorCount = Object.keys(errors).length;
            toast.error('Configuración incompleta', {
                description: `Hay ${errorCount > 0 ? errorCount : 'campos'} campo(s) con errores. Revísalos antes de continuar.`,
                icon: <AlertCircle className="h-4 w-4" />,
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
                                        <SelectItem value="webhook">Mensaje Entrante (Webhook)</SelectItem>
                                        <SelectItem value="manual" disabled>Manual / API (Próximamente)</SelectItem>
                                        <SelectItem value="schedule" disabled>Programado (Próximamente)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.triggerType === 'webhook' && (
                                <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                    <div className="space-y-2">
                                        <Label>Canal</Label>
                                        <Select
                                            value={(formData.channel as string) || 'whatsapp'}
                                            onValueChange={(v) => handleChange('channel', v)}
                                        >
                                            <SelectTrigger className="bg-white dark:bg-slate-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="sms">SMS</SelectItem>
                                                <SelectItem value="instagram">Instagram</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">El workflow se ejecutará cuando llegue un mensaje por este canal.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Palabra Clave (Opcional)</Label>
                                        <Input
                                            value={(formData.keyword as string) || ''}
                                            onChange={(e) => handleChange('keyword', e.target.value)}
                                            placeholder="ej. info, precios, hola"
                                            className="bg-white dark:bg-slate-900"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Si se deja vacío, se ejecutará para <strong>cualquier mensaje</strong> en este canal.
                                        </p>
                                    </div>
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
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label>Contenido del Mensaje</Label>
                                        <span className="text-xs text-blue-500 cursor-pointer hover:underline">Insert Variable</span>
                                    </div>
                                    <Textarea
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
                                        <Label>Nombre del Lead<span className="text-red-500 ml-1">*</span></Label>
                                        <Input
                                            value={(formData.leadName as string) || ''}
                                            onChange={(e) => handleChange('leadName', e.target.value)}
                                            placeholder="{'{{message.sender}}'}"
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
                                <Label>Asunto<span className="text-red-500 ml-1">*</span></Label>
                                <Input
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
                                <Label>Cuerpo (HTML)<span className="text-red-500 ml-1">*</span></Label>
                                <Textarea
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
                                    <span className="text-xs text-muted-foreground">
                                        {((formData.body as string) || '').length}/160
                                    </span>
                                </div>
                                <Textarea
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
                                    <span className="text-xs text-muted-foreground">{formData.temperature || 0.7}</span>
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
            </SheetContent>
        </Sheet >
    );
}

