"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ServiceCategory, createCategory, updateCategory } from "@/modules/features/catalog/categories-actions"
import * as LucideIcons from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CategoryFormSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: ServiceCategory | null
    onSuccess: () => void
}

const AVAILABLE_ICONS = [
    'Server', 'Palette', 'Monitor', 'Globe', 'TrendingUp',
    'MessageCircle', 'Briefcase', 'Lightbulb', 'Puzzle', 'Folder',
    'Package', 'Scissors', 'Coffee', 'Camera', 'Music',
    'Heart', 'Star', 'Shield', 'Award', 'Target'
]

const AVAILABLE_COLORS = [
    { name: 'blue', label: 'Azul' },
    { name: 'purple', label: 'Morado' },
    { name: 'pink', label: 'Rosa' },
    { name: 'indigo', label: 'Índigo' },
    { name: 'green', label: 'Verde' },
    { name: 'orange', label: 'Naranja' },
    { name: 'cyan', label: 'Cian' },
    { name: 'amber', label: 'Ámbar' },
    { name: 'red', label: 'Rojo' },
    { name: 'gray', label: 'Gris' },
]

import { useTranslation } from "@/modules/core/i18n/use-translation"

export function CategoryFormSheet({ open, onOpenChange, category, onSuccess }: CategoryFormSheetProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [icon, setIcon] = useState('Folder')
    const [color, setColor] = useState('blue')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (category) {
            setName(category.name)
            setIcon(category.icon)
            setColor(category.color)
        } else {
            setName('')
            setIcon('Folder')
            setColor('blue')
        }
    }, [category, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error(t('catalog.categories.toasts.name_required'))
            return
        }

        setLoading(true)
        try {
            if (category) {
                await updateCategory(category.id, { name, icon, color })
                toast.success(t('catalog.categories.toasts.update_success'))
            } else {
                await createCategory({ name, icon, color })
                toast.success(t('catalog.categories.toasts.create_success'))
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || t('catalog.categories.toasts.save_error'))
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder
        return IconComponent
    }

    const getColorClass = (colorName: string) => {
        const colorMap: Record<string, string> = {
            blue: 'bg-blue-500',
            purple: 'bg-purple-500',
            pink: 'bg-pink-500',
            indigo: 'bg-indigo-500',
            green: 'bg-green-500',
            orange: 'bg-orange-500',
            cyan: 'bg-cyan-500',
            amber: 'bg-amber-500',
            red: 'bg-red-500',
            gray: 'bg-gray-500',
        }
        return colorMap[colorName] || colorMap.blue
    }

    const SelectedIcon = getIcon(icon)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[500px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent flex flex-col
                "
            >
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                            <LucideIcons.FolderPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {category ? t('catalog.categories.edit_title') : t('catalog.categories.new_title')}
                            </SheetTitle>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                {t('catalog.categories.form_desc')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                            {/* Name Input */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('catalog.categories.form.name_label')}</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('catalog.categories.form.name_placeholder')}
                                    required
                                    className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white"
                                />
                            </div>

                            {/* Icon Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('catalog.categories.form.icon_label')}</Label>
                                <Select value={icon} onValueChange={setIcon}>
                                    <SelectTrigger className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white">
                                        <SelectValue>
                                            <div className="flex items-center gap-2">
                                                <SelectedIcon className="h-4 w-4 text-brand-pink" />
                                                <span>{icon}</span>
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                                        <ScrollArea className="h-[200px]">
                                            {AVAILABLE_ICONS.map((iconName) => {
                                                const IconComp = getIcon(iconName)
                                                return (
                                                    <SelectItem key={iconName} value={iconName}>
                                                        <div className="flex items-center gap-2">
                                                            <IconComp className="h-4 w-4" />
                                                            <span>{iconName}</span>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Color Picker */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('catalog.categories.form.color_label')}</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {AVAILABLE_COLORS.map((col) => (
                                        <button
                                            key={col.name}
                                            type="button"
                                            onClick={() => setColor(col.name)}
                                            className={`
                                                h-10 rounded-xl transition-all cursor-pointer
                                                ${getColorClass(col.name)}
                                                ${color === col.name ? 'ring-2 ring-offset-2 ring-brand-pink scale-105' : 'opacity-75 hover:opacity-100'}
                                            `}
                                            title={col.label}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400">
                                    {t('catalog.categories.form.color_selected').replace('{color}', AVAILABLE_COLORS.find(c => c.name === color)?.label || color)}
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="p-4 border border-slate-100 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">
                                <Label className="text-xs text-slate-400 dark:text-gray-400 mb-2 block font-semibold">{t('catalog.categories.form.preview_label')}</Label>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${getColorClass(color).replace('bg-', 'bg-').replace('-500', '-100')} dark:bg-white/10`}>
                                        <SelectedIcon className={`h-6 w-6 ${getColorClass(color).replace('bg-', 'text-')}`} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">{name || t('catalog.categories.form.preview_default_name')}</div>
                                        <div className="text-xs text-slate-500 dark:text-gray-400">{icon} • {AVAILABLE_COLORS.find(c => c.name === color)?.label}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                                disabled={loading}
                            >
                                {t('catalog.buttons.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-brand-pink/20 px-8 rounded-xl h-11 font-bold cursor-pointer transition-all"
                                disabled={loading}
                            >
                                {loading ? t('common.saving') : category ? t('common.actions.update') : t('common.actions.create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}

