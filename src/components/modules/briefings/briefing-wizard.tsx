"use client"

import { useState } from "react"
import { Briefing, FullBriefingTemplate, BriefingField } from "@/types/briefings"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveBriefingResponse, submitBriefing } from "@/lib/actions/briefings"
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Save, Sparkles } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { toast } from "sonner"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import manWorkingAnimation from "../../../../public/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json"
import ideaBulbAnimation from "../../../../public/animations/target-idea-bulb-illustration-2025-10-20-03-15-58-utc.json"

interface BriefingWizardProps {
    briefing: Briefing
    template: FullBriefingTemplate
    initialResponses: Record<string, any>
}

export function BriefingWizard({ briefing, template, initialResponses }: BriefingWizardProps) {
    // ========================================
    // 1. ALL HOOKS FIRST (React Rules)
    // ========================================
    const [responses, setResponses] = useState<Record<string, any>>(initialResponses || {})
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [showIntro, setShowIntro] = useState(true)

    // Debounced auto-save
    const debouncedSave = useDebouncedCallback(async (fieldId: string, value: any) => {
        setSaving(true)
        try {
            await saveBriefingResponse(briefing.id, fieldId, value)
        } catch (error) {
            console.error("Failed to save response:", error)
            toast.error("Error al guardar. Intenta de nuevo.")
        } finally {
            setSaving(false)
        }
    }, 800)

    // ========================================
    // 2. DERIVE DATA (After hooks, before guard clauses)
    // ========================================
    const steps = template?.structure
        ? template.structure.reduce<{ id: string; title: string; fields: BriefingField[] }[]>((acc, field) => {
            const stepTitle = field.step_title || "General"
            let step = acc.find((s) => s.title === stepTitle)
            if (!step) {
                step = { id: stepTitle, title: stepTitle, fields: [] }
                acc.push(step)
            }
            step.fields.push(field)
            return acc
        }, [])
        : []

    const currentStep = steps[currentStepIndex]
    const totalSteps = steps.length
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

    // ========================================
    // 3. HANDLERS
    // ========================================
    const handleFieldChange = (fieldId: string, value: any) => {
        setResponses((prev) => ({ ...prev, [fieldId]: value }))
        debouncedSave(fieldId, value)
    }

    const validateCurrentStep = (): boolean => {
        if (!currentStep) return true

        for (const field of currentStep.fields) {
            if (field.required) {
                const value = responses[field.id]
                if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
                    toast.error(`El campo "${field.label}" es obligatorio`)
                    return false
                }
            }
        }
        return true
    }

    const handleNext = async () => {
        if (!validateCurrentStep()) return

        if (currentStepIndex < totalSteps - 1) {
            setCurrentStepIndex((prev) => prev + 1)
            window.scrollTo(0, 0)
        } else {
            // Last step, submit
            handleSubmit()
        }
    }

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1)
            window.scrollTo(0, 0)
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await submitBriefing(briefing.id)
            setCompleted(true)
            toast.success("¡Briefing enviado correctamente!")
        } catch (error) {
            console.error("Error submitting briefing:", error)
            toast.error("Error al enviar el briefing")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ========================================
    // 4. GUARD CLAUSES (After ALL hooks)
    // ========================================
    if (completed) {
        return (
            <div className="text-center py-20 animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-64 h-64 mb-6">
                    <LottieAnimation animationData={manWorkingAnimation} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Gracias!</h1>
                <p className="text-xl text-gray-600 mb-8">
                    Hemos recibido tu información correctamente.
                    <br />
                    Nuestro equipo revisará el briefing y te contactará pronto.
                </p>
                <Button variant="outline" onClick={() => window.close()}>
                    Cerrar
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
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Briefing: {template.name}</h1>
                            <p className="text-xl text-pink-600 font-medium">Hola {briefing.client?.name || "Cliente"}</p>
                        </div>

                        <div className="text-gray-600 leading-relaxed max-w-lg mx-auto">
                            <p>Responde estas breves preguntas para ayudarnos a entender tus objetivos y crear una estrategia a tu medida.</p>
                        </div>

                        <div className="pt-6">
                            <Button
                                size="lg"
                                onClick={() => setShowIntro(false)}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-8 text-lg h-12 rounded-full shadow-lg shadow-pink-500/20 transition-all hover:scale-105"
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

    if (!template || steps.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <Card className="max-w-md w-full p-8 text-center">
                    <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Esta plantilla no tiene preguntas configuradas.</p>
                    <p className="text-sm text-muted-foreground">Por favor contacta al administrador.</p>
                </Card>
            </div>
        )
    }

    // ========================================
    // 5. MAIN RENDER
    // ========================================
    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {/* Header / Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        Paso {currentStepIndex + 1} de {totalSteps}
                    </span>
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
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    {currentStep.fields.map((field) => (
                        <FieldRenderer key={field.id} field={field} value={responses[field.id]} onChange={(val) => handleFieldChange(field.id, val)} />
                    ))}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleBack} disabled={currentStepIndex === 0 || isSubmitting}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Atrás
                </Button>

                <Button onClick={handleNext} disabled={isSubmitting} className="bg-pink-600 hover:bg-pink-700 text-white px-8">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                        </>
                    ) : currentStepIndex === totalSteps - 1 ? (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Enviar Respuestas
                        </>
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

// ========================================
// Field Renderer Sub-Component
// ========================================
function FieldRenderer({ field, value, onChange }: { field: BriefingField; value: any; onChange: (value: any) => void }) {
    const [selectedColors, setSelectedColors] = useState<string[]>(Array.isArray(value) ? value : [])
    const [selectedTypographies, setSelectedTypographies] = useState<string[]>(Array.isArray(value) ? value : [])

    const handleColorToggle = (color: string) => {
        const newColors = selectedColors.includes(color) ? selectedColors.filter((c) => c !== color) : [...selectedColors, color]
        setSelectedColors(newColors)
        onChange(newColors)
    }

    const handleTypographyToggle = (typo: string) => {
        const newTypos = selectedTypographies.includes(typo) ? selectedTypographies.filter((t) => t !== typo) : [...selectedTypographies, typo]
        setSelectedTypographies(newTypos)
        onChange(newTypos)
    }

    return (
        <div className="space-y-2">
            <Label className="text-base font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.help_text && <p className="text-sm text-muted-foreground">{field.help_text}</p>}

            {/* Text Input */}
            {field.type === "text" && (
                <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "Escribe tu respuesta..."} className="h-11" />
            )}

            {/* Textarea */}
            {field.type === "textarea" && (
                <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "Escribe tu respuesta..."} rows={4} />
            )}

            {/* Select Dropdown (Single Choice) */}
            {field.type === "select" && field.options && field.options.length > 0 && (
                <Select value={value || ""} onValueChange={onChange}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecciona una opción..." />
                    </SelectTrigger>
                    <SelectContent>
                        {field.options.map((option, i) => (
                            <SelectItem key={i} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Multiselect (Checkboxes) */}
            {field.type === "multiselect" && field.options && field.options.length > 0 && (
                <div className="space-y-2 border rounded-lg p-4">
                    {field.options.map((option, i) => {
                        const isChecked = Array.isArray(value) && value.includes(option)
                        return (
                            <div key={i} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`${field.id}-${i}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                        const currentValues = Array.isArray(value) ? value : []
                                        const newValues = e.target.checked ? [...currentValues, option] : currentValues.filter((v) => v !== option)
                                        onChange(newValues)
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <label htmlFor={`${field.id}-${i}`} className="text-sm font-medium leading-none cursor-pointer">
                                    {option}
                                </label>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Color Picker (Multiple Selection) */}
            {field.type === "color" && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { name: "Azul", value: "#3B82F6" },
                        { name: "Rojo", value: "#EF4444" },
                        { name: "Verde", value: "#10B981" },
                        { name: "Amarillo", value: "#F59E0B" },
                        { name: "Morado", value: "#8B5CF6" },
                        { name: "Rosa", value: "#EC4899" },
                        { name: "Negro", value: "#000000" },
                        { name: "Blanco", value: "#FFFFFF" },
                    ].map((color) => {
                        const isSelected = selectedColors.includes(color.value)
                        return (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => handleColorToggle(color.value)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full border shadow-sm" style={{ backgroundColor: color.value }} />
                                <span className="text-xs font-medium">{color.name}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Typography Picker (Multiple Selection) */}
            {field.type === "typography" && (
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: "sans", name: "Sans Serif", example: "Aa" },
                        { id: "serif", name: "Serif", example: "Aa" },
                        { id: "slab", name: "Slab Serif", example: "Aa" },
                        { id: "modern", name: "Moderno", example: "Aa" },
                        { id: "decorative", name: "Decorativa", example: "Aa" },
                        { id: "script", name: "Manuscrita", example: "Aa" },
                        { id: "display", name: "Display Bold", example: "Aa" },
                    ].map((typo) => {
                        const isSelected = selectedTypographies.includes(typo.id)
                        return (
                            <button
                                key={typo.id}
                                type="button"
                                onClick={() => handleTypographyToggle(typo.id)}
                                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <span className="text-2xl font-bold">{typo.example}</span>
                                <span className="text-sm font-medium">{typo.name}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* File Upload */}
            {field.type === "upload" && <Input type="file" onChange={(e) => onChange(e.target.files?.[0])} />}

            {/* Fallback for unknown types */}
            {!["text", "textarea", "select", "multiselect", "color", "typography", "upload"].includes(field.type) && (
                <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "Escribe tu respuesta..."} className="h-11" />
            )}
        </div>
    )
}
