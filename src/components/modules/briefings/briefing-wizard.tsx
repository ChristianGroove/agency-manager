"use client"

import { useState, useEffect } from "react"
import { Briefing, FullBriefingTemplate, BriefingField } from "@/types/briefings"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveBriefingResponse, submitBriefing } from "@/lib/actions/briefings"
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Save, Plus, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import manWorkingAnimation from "../../../../public/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json"
import ideaBulbAnimation from "../../../../public/animations/target-idea-bulb-illustration-2025-10-20-03-15-58-utc.json"

interface BriefingWizardProps {
    briefing: Briefing
    template: FullBriefingTemplate
    initialResponses: Record<string, any>
}

export function BriefingWizard({ briefing, template, initialResponses }: BriefingWizardProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [responses, setResponses] = useState<Record<string, any>>(initialResponses)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [showIntro, setShowIntro] = useState(true)

    const currentStep = template.steps[currentStepIndex]
    const totalSteps = template.steps.length
    const progress = ((currentStepIndex + 1) / totalSteps) * 100

    // ... (keep auto-save logic and handlers)

    // Auto-save logic
    const debouncedSave = useDebouncedCallback(async (fieldId: string, value: any) => {
        setSaving(true)
        try {
            await saveBriefingResponse(briefing.id, fieldId, value)
        } catch (error) {
            console.error("Failed to save", error)
            toast.error("Error al guardar cambios")
        } finally {
            setSaving(false)
        }
    }, 500)

    const handleFieldChange = (fieldId: string, value: any) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }))
        debouncedSave(fieldId, value)
    }

    const validateStep = () => {
        if (!currentStep) return true

        for (const field of currentStep.fields) {
            if (field.required) {
                const value = responses[field.id]
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                    toast.error(`El campo "${field.label}" es obligatorio`)
                    return false
                }
            }
        }
        return true
    }

    // Force save all fields in current step before moving
    const flushCurrentStepSaves = async () => {
        if (!currentStep) return

        // We use promise.all to save all fields in parallel to be sure
        // In a real optimized app we would track dirty fields, but this is safer
        const promises = currentStep.fields.map(field => {
            const value = responses[field.id]
            if (value !== undefined) {
                return saveBriefingResponse(briefing.id, field.id, value)
            }
            return Promise.resolve()
        })

        try {
            setSaving(true)
            await Promise.all(promises)
        } catch (e) {
            console.error("Error flushing saves", e)
        } finally {
            setSaving(false)
        }
    }

    const handleNext = async () => {
        if (validateStep()) {
            await flushCurrentStepSaves() // Ensure saved before moving

            if (currentStepIndex < totalSteps - 1) {
                setCurrentStepIndex(prev => prev + 1)
                window.scrollTo(0, 0)
            } else {
                // Final step - Submit
                handleSubmit()
            }
        }
    }

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1)
            window.scrollTo(0, 0)
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await submitBriefing(briefing.id)
            setCompleted(true)
            toast.success("Briefing enviado correctamente")
        } catch (error) {
            console.error("Error submitting", error)
            toast.error("Error al enviar el briefing")
            setIsSubmitting(false)
        }
    }

    if (completed) {
        return (
            <div className="text-center py-20 animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-64 h-64 mb-6">
                    <LottieAnimation animationData={manWorkingAnimation} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Gracias!</h1>
                <p className="text-xl text-gray-600 mb-8">
                    Hemos recibido tu información correctamente.<br />
                    Nuestro equipo revisará el briefing y te contactará pronto.
                </p>
                <Button variant="outline" onClick={() => window.close()}>
                    Cerrar ventana
                </Button>
            </div>
        )
    }

    if (showIntro) {
        return (
            <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-0 shadow-xl ring-1 ring-gray-200/50">
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="w-64 h-64 mx-auto -my-5">
                            <LottieAnimation animationData={ideaBulbAnimation} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                Briefing: {template.name}
                            </h1>
                            <p className="text-xl text-[#F205E2] font-medium">
                                Hola {briefing.client?.name || 'Cliente'}
                            </p>
                        </div>

                        <div className="text-gray-600 leading-relaxed max-w-lg mx-auto">
                            <p>
                                Responde estas breves preguntas para ayudarnos a entender tus objetivos y crear una estrategia a tu medida.
                            </p>
                        </div>

                        <div className="pt-6">
                            <Button
                                size="lg"
                                onClick={() => setShowIntro(false)}
                                className="bg-[#F205E2] hover:bg-[#D104C3] text-white px-8 text-lg h-12 rounded-full shadow-lg shadow-pink-500/20 transition-all hover:scale-105"
                            >
                                Comenzar
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header / Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Paso {currentStepIndex + 1} de {totalSteps}</span>
                    <span className="flex items-center gap-2">
                        {saving ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-3 w-3" />
                                Guardado
                            </>
                        )}
                    </span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Step Content */}
            <Card className="border-0 shadow-lg ring-1 ring-gray-200/50">
                <CardHeader>
                    <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
                    {currentStep.description && (
                        <CardDescription className="text-base">{currentStep.description}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    {currentStep.fields.map((field) => (
                        <FieldRenderer
                            key={field.id}
                            field={field}
                            value={responses[field.id]}
                            onChange={(val) => handleFieldChange(field.id, val)}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStepIndex === 0 || isSubmitting}
                    className="w-32"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="w-32 bg-[#F205E2] hover:bg-[#D104C3] text-white"
                >
                    {currentStepIndex === totalSteps - 1 ? (
                        isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'
                    ) : (
                        <>
                            Siguiente
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}

// --- Field Components ---

function FieldRenderer({ field, value, onChange }: { field: BriefingField, value: any, onChange: (val: any) => void }) {
    const options = field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : []

    return (
        <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
            </Label>

            {field.help_text && (
                <p className="text-sm text-gray-500 -mt-2 mb-2">{field.help_text}</p>
            )}

            {field.type === 'text' && (
                <Input
                    placeholder={field.placeholder || ''}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}

            {field.type === 'textarea' && (
                <Textarea
                    placeholder={field.placeholder || ''}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-h-[120px]"
                />
            )}

            {field.type === 'select' && (
                <Select value={value || ''} onValueChange={onChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((opt: string) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {field.type === 'multiselect' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((opt: string) => {
                        const isChecked = Array.isArray(value) && value.includes(opt)
                        return (
                            <div key={opt} className={cn(
                                "flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                isChecked ? "border-[#F205E2] bg-pink-50" : "border-gray-200 hover:border-gray-300"
                            )}>
                                <Checkbox
                                    id={`${field.id}-${opt}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                        const current = Array.isArray(value) ? value : []
                                        if (checked) {
                                            onChange([...current, opt])
                                        } else {
                                            onChange(current.filter((v: string) => v !== opt))
                                        }
                                    }}
                                />
                                <label
                                    htmlFor={`${field.id}-${opt}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                                >
                                    {opt}
                                </label>
                            </div>
                        )
                    })}
                </div>
            )}

            {field.type === 'radio' && (
                <RadioGroup value={value || ''} onValueChange={onChange} className="space-y-2">
                    {options.map((opt: string) => (
                        <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                            <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
                        </div>
                    ))}
                </RadioGroup>
            )}

            {field.type === 'color' && (
                <ColorPaletteInput
                    value={value || []}
                    onChange={onChange}
                    maxColors={5}
                />
            )}
        </div>
    )
}

function ColorPaletteInput({ value, onChange, maxColors = 5 }: { value: string[], onChange: (val: string[]) => void, maxColors?: number }) {
    const [currentColor, setCurrentColor] = useState("#F205E2")

    const handleAddColor = () => {
        if (value.length >= maxColors) return
        if (!value.includes(currentColor)) {
            onChange([...value, currentColor])
        }
    }

    const handleRemoveColor = (color: string) => {
        onChange(value.filter(c => c !== color))
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-3 items-end">
                <div className="space-y-1.5 flex-1">
                    <Label className="text-xs text-gray-500 font-normal">Selector de Color</Label>
                    <div className="flex gap-2">
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden border shadow-sm ring-1 ring-black/5 hover:ring-black/10 transition-shadow">
                            <input
                                type="color"
                                value={currentColor}
                                onChange={(e) => setCurrentColor(e.target.value)}
                                className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                            />
                        </div>
                        <Input
                            value={currentColor}
                            onChange={(e) => setCurrentColor(e.target.value)}
                            className="w-28 font-mono uppercase"
                            maxLength={7}
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    onClick={handleAddColor}
                    disabled={value.length >= maxColors}
                    variant="secondary"
                    className="mb-0.5"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                </Button>
            </div>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {value.map((color, idx) => (
                        <div
                            key={`${color}-${idx}`}
                            className="group relative flex items-center justify-center w-12 h-12 rounded-full shadow-sm ring-2 ring-white transition-transform hover:scale-105"
                            style={{ backgroundColor: color }}
                        >
                            <button
                                onClick={() => handleRemoveColor(color)}
                                className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <p className="text-xs text-gray-400 text-right">
                {value.length} / {maxColors} colores seleccionados
            </p>
        </div>
    )
}
