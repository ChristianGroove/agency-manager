'use client'

import { useState } from 'react'
import { createApp } from '@/modules/core/saas/app-management-actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Package, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateAppDialogProps {
    dict: any // Type this strictly if possible, for now 'any' matches the i18n structure
}

export function CreateAppDialog({ dict }: CreateAppDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedColor, setSelectedColor] = useState('#8B5CF6')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        try {
            const result = await createApp({
                name: formData.get('name') as string,
                slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                price_monthly: parseFloat(formData.get('price_monthly') as string),
                color: formData.get('color') as string || '#8B5CF6',
            })

            if (result.success) {
                toast.success(dict?.toast?.created || 'App creada correctamente')
                setOpen(false)
                router.refresh()
                    // Reset form
                    ; (e.target as HTMLFormElement).reset()
            } else {
                toast.error('Error al crear app', {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error('Error interno', {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
                    <Plus className="h-4 w-4" />
                    {dict?.create_button || 'Crear Nueva Plantilla'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-6 bg-gray-50/50 border-b">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Package className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl">
                            {dict?.create_dialog_title || 'Crear Plantilla de Solución'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        {dict?.description || 'Define la estructura base para una nueva vertical de negocio.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* App Name & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="font-medium text-gray-700">
                                {dict?.form?.name || 'Nombre de la Plantilla'}
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ej: Marketing Agency Starter"
                                required
                                className="bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category" className="font-medium text-gray-700">
                                {dict?.form?.category || 'Categoría'}
                            </Label>
                            <Select name="category" defaultValue="general">
                                <SelectTrigger id="category" className="bg-gray-50 focus:bg-white">
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                    <SelectItem value="sales">Ventas</SelectItem>
                                    <SelectItem value="finance">Finanzas</SelectItem>
                                    <SelectItem value="hr">Recursos Humanos</SelectItem>
                                    <SelectItem value="operations">Operaciones</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Descriptions */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="font-medium text-gray-700">
                                {dict?.form?.short_description || 'Descripción Corta'}
                            </Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="Resumen breve para la tarjeta (max 100 caracteres)"
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="long_description" className="font-medium text-gray-700">
                                {dict?.form?.full_description || 'Descripción Detallada (Opcional)'}
                            </Label>
                            <Textarea
                                id="long_description"
                                name="long_description"
                                placeholder="Detalles completos sobre las funcionalidades incluidas..."
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pricing */}
                        <div className="space-y-3">
                            <Label className="font-medium text-gray-700 block">Configuración de Precio</Label>
                            <div className="flex gap-3">
                                <div className="space-y-1.5 flex-1">
                                    <Label htmlFor="price_monthly" className="text-xs text-muted-foreground">{dict?.form?.monthly_price || 'Precio Mensual'}</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                        <Input
                                            id="price_monthly"
                                            name="price_monthly"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="49.99"
                                            required
                                            className="pl-7"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 w-24">
                                    <Label htmlFor="trial_days" className="text-xs text-muted-foreground">{dict?.form?.trial_days || 'Prueba'}</Label>
                                    <div className="relative">
                                        <Input
                                            id="trial_days"
                                            name="trial_days"
                                            type="number"
                                            min="0"
                                            placeholder="14"
                                            defaultValue={14}
                                            className="pr-8"
                                        />
                                        <span className="absolute right-2 top-2.5 text-xs text-gray-400">días</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branding */}
                        <div className="space-y-3">
                            <Label className="font-medium text-gray-700 block">{dict?.form?.brand_color || 'Color de Marca'}</Label>
                            <div className="flex gap-3 items-end">
                                <div
                                    className="w-10 h-10 rounded-lg shadow-sm border border-gray-200"
                                    style={{ backgroundColor: selectedColor }}
                                />
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor="color" className="text-xs text-muted-foreground">Hex Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="color"
                                            name="color"
                                            type="color"
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                            className="w-10 h-10 p-1 cursor-pointer absolute opacity-0"
                                        />
                                        <Input
                                            type="text"
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                            placeholder="#8B5CF6"
                                            className="font-mono uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Note - Fixed */}
                    {(dict?.form?.note_text) && (
                        <div className="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                            <div className="shrink-0 mt-0.5">
                                <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">i</div>
                            </div>
                            <p>
                                <strong className="font-semibold block mb-0.5">{dict?.form?.note_strong || 'Nota Importante:'}</strong>
                                {dict.form.note_text}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t mt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                            {dict?.form?.cancel || 'Cancelar'}
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? (dict?.form?.creating || 'Creando...') : (dict?.form?.create || 'Crear Plantilla')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
