"use client"

import { useState, useMemo, useEffect } from "react"
import { Briefing, FullBriefingTemplate, BriefingField } from "@/types/briefings"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Using raw divs for custom sheet look
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getBriefingByToken, saveBriefingResponse, submitBriefing } from "@/modules/verticals/agency/briefings/actions"
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Save, Sparkles, ArrowRight } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// Animations
import { LottieAnimation } from "@/components/ui/lottie-animation"
import manWorkingAnimation from "../../../../../public/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json"
import ideaBulbAnimation from "../../../../../public/animations/target-idea-bulb-illustration-2025-10-20-03-15-58-utc.json"

interface BriefingWizardProps {
    briefing: Briefing
    template: FullBriefingTemplate
    initialResponses: Record<string, any>
}

type WizardStatus = 'intro' | 'filling' | 'submitting' | 'completed'

export function BriefingWizard({ briefing, template, initialResponses }: BriefingWizardProps) {
    // ========================================
    // 1. HOOKS & STATE (Single Source of Truth)
    // ========================================
    const [status, setStatus] = useState<WizardStatus>('intro')
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>(initialResponses || {})
    const [isSaving, setIsSaving] = useState(false)

    // Debounced Save Action
    const debouncedSave = useDebouncedCallback(async (fieldId: string, value: any) => {
        setIsSaving(true)
        try {
            await saveBriefingResponse(briefing.id, fieldId, value)
        } catch (error) {
            console.error("Save error:", error)
            toast.error("Error guardando respuesta")
        } finally {
            setIsSaving(false)
        }
    }, 800)

    // ========================================
    // 2. DATA DERIVATION (Modular Steps)
    // ========================================
    const steps = useMemo(() => {
        if (!template?.structure) return []
        return template.structure.reduce<{ id: string; title: string; description?: string; fields: BriefingField[] }[]>((acc, field) => {
            const stepTitle = field.step_title || "Información General"
            let step = acc.find((s) => s.title === stepTitle)
            if (!step) {
                step = { id: stepTitle, title: stepTitle, description: field.step_description, fields: [] }
                acc.push(step)
            }
            step.fields.push(field)
            return acc
        }, [])
    }, [template])

    const currentStep = steps[currentStepIndex]
    const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0

    // Auto-skip intro if answers exist? Maybe not, context is good.
    // Ensure we start at 0 or saved position? For now 0 is fine.

    // ========================================
    // 3. HANDLERS
    // ========================================
    const handleAnswerChange = (fieldId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }))
        debouncedSave(fieldId, value)
    }

    const validateStep = () => {
        if (!currentStep) return true
        for (const field of currentStep.fields) {
            if (field.required) {
                const val = answers[field.id]
                if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                    toast.error(`Requerido: ${field.label}`)
                    return false
                }
            }
        }
        return true
    }

    const handleNext = () => {
        if (!validateStep()) return
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1)
    }

    const handleSubmit = async () => {
        setStatus('submitting')
        try {
            await submitBriefing(briefing.id)
            setStatus('completed')
            toast.success("¡Briefing enviado con éxito!")
        } catch (error) {
            console.error(error)
            toast.error("Error al enviar")
            setStatus('filling')
        }
    }

    // ========================================
    // 4. RENDER: INTRO & COMPLETED
    // ========================================
    if (status === 'completed') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-64 h-64">
                    <LottieAnimation animationData={manWorkingAnimation} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900">¡Todo Listo!</h2>
                    <p className="text-lg text-gray-500 max-w-md mx-auto">
                        Hemos recibido tu información. Nuestro equipo comenzará a trabajar en tu estrategia de inmediato.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.close()}>Cerrar Ventana</Button>
            </div>
        )
    }

    if (status === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20 max-w-2xl w-full text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

                    <div className="w-48 h-48 mx-auto">
                        <LottieAnimation animationData={ideaBulbAnimation} />
                    </div>

                    <div className="space-y-4">
                        <Badge variant="secondary" className="px-4 py-1 text-sm bg-pink-50 text-pink-700 border-pink-100">
                            Briefing de Proyecto
                        </Badge>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                            {template.name}
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed">
                            Hola <span className="font-semibold text-pink-600">{briefing.client?.name}</span>.
                            Ayúdanos a entender tu visión respondiendo estas preguntas clave.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={() => setStatus('filling')}
                        className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-10 h-14 text-lg shadow-xl shadow-gray-900/10 transition-all hover:scale-105"
                    >
                        Comenzar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        )
    }

    // ========================================
    // 5. RENDER: SINGLE COLUMN SHEET
    // ========================================
    return (
        <div className="w-full max-w-4xl mx-auto min-h-[85vh] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in duration-500">

            {/* FORM CONTAINER */}
            <div className="flex flex-col h-full bg-white/50 relative">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <div>
                        <p className="text-xs font-semibold text-pink-600 uppercase tracking-widest mb-1">Paso {currentStepIndex + 1} de {steps.length}</p>
                        <h2 className="text-2xl font-bold text-gray-900">{currentStep?.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin text-pink-500" /> : <Save className="h-3 w-3" />}
                        {isSaving ? "Guardando..." : "Guardado"}
                    </div>
                </div>

                {/* Progress Bar (Thin) */}
                <Progress value={progress} className="h-1 rounded-none bg-gray-100" indicatorClassName="bg-gradient-to-r from-pink-500 to-purple-600" />

                {/* Form Fields Area */}
                <ScrollArea className="flex-1 p-6 md:p-10">
                    <div className="max-w-xl mx-auto space-y-10 pb-20">
                        {currentStep?.description && (
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 leading-relaxed">
                                {currentStep.description}
                            </div>
                        )}

                        {currentStep?.fields.map(field => (
                            <div key={field.id} className="space-y-3 group animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${currentStep.fields.indexOf(field) * 100}ms` }}>
                                <div className="flex items-baseline justify-between">
                                    <Label className="text-lg font-medium text-gray-800 group-focus-within:text-pink-600 transition-colors">
                                        {field.label}
                                        {field.required && <span className="text-pink-500 ml-1">*</span>}
                                    </Label>
                                </div>

                                <FieldInput
                                    field={field}
                                    value={answers[field.id]}
                                    onChange={(val) => handleAnswerChange(field.id, val)}
                                />

                                {field.help_text && (
                                    <p className="text-sm text-gray-400 pl-1">{field.help_text}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md sticky bottom-0 z-10 flex justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>

                    <Button
                        onClick={handleNext}
                        className="bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10 px-8 rounded-xl"
                    >
                        {currentStepIndex === steps.length - 1 ? (
                            <>Enviar Todo <CheckCircle2 className="ml-2 h-4 w-4" /></>
                        ) : (
                            <>Siguiente <ChevronRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ========================================
// SUB-COMPONENTS & UTILS
// ========================================

function FieldInput({ field, value, onChange }: { field: BriefingField, value: any, onChange: (v: any) => void }) {
    switch (field.type) {
        case 'text':
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} className="bg-white" placeholder="Escribe aquí..." />
        case 'textarea':
            return <Textarea value={value || ''} onChange={e => onChange(e.target.value)} className="bg-white resize-none min-h-[120px]" placeholder="Escribe aquí..." />
        case 'select':
            return (
                <Select value={value || ''} onValueChange={onChange}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                        {field.options?.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            )
        case 'multiselect':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {field.options?.map((opt) => {
                        const checked = Array.isArray(value) && value.includes(opt)
                        return (
                            <div
                                key={opt}
                                onClick={() => {
                                    const curr = Array.isArray(value) ? value : []
                                    const next = checked ? curr.filter((v: string) => v !== opt) : [...curr, opt]
                                    onChange(next)
                                }}
                                className={cn(
                                    "cursor-pointer border rounded-xl p-3 text-sm font-medium transition-all select-none flex items-center gap-2",
                                    checked ? "border-pink-500 bg-pink-50 text-pink-700" : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                            >
                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", checked ? "border-pink-500 bg-pink-500" : "border-gray-300")}>
                                    {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                {opt}
                            </div>
                        )
                    })}
                </div>
            )
        // Add Color/Typography pickers similarly if needed, keeping code concise
        default:
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} className="bg-white" />
    }
}
