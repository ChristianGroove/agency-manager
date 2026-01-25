"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ServiceCategory, getCategories, deleteCategory } from "@/modules/core/catalog/categories-actions"
import { CategoryFormSheet } from "./category-form-sheet"
import * as LucideIcons from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"

export function CategoryManager() {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
    const [formOpen, setFormOpen] = useState(false)

    const loadCategories = async () => {
        setLoading(true)
        try {
            const cats = await getCategories()
            setCategories(cats)
        } catch (error) {
            console.error('Error loading categories:', error)
            toast.error(t('catalog.categories.toasts.load_error'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            loadCategories()
        }
    }, [open])

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('catalog.categories.delete_confirm_title').replace('{name}', name) + '\n\n' + t('catalog.categories.delete_confirm_desc'))) {
            return
        }

        try {
            await deleteCategory(id)
            toast.success(t('catalog.categories.toasts.delete_success'))
            loadCategories()
        } catch (error: any) {
            toast.error(error.message || t('catalog.categories.toasts.delete_error'))
        }
    }

    const handleEdit = (category: ServiceCategory) => {
        setEditingCategory(category)
        setFormOpen(true)
    }

    const handleCreateNew = () => {
        setEditingCategory(null)
        setFormOpen(true)
    }

    const handleFormSuccess = () => {
        setFormOpen(false)
        setEditingCategory(null)
        loadCategories()
    }

    const getIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder
        return IconComponent
    }

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { text: string, bg: string }> = {
            blue: { text: 'text-blue-500', bg: 'bg-blue-50' },
            purple: { text: 'text-purple-500', bg: 'bg-purple-50' },
            pink: { text: 'text-pink-500', bg: 'bg-pink-50' },
            indigo: { text: 'text-indigo-500', bg: 'bg-indigo-50' },
            green: { text: 'text-green-500', bg: 'bg-green-50' },
            orange: { text: 'text-orange-500', bg: 'bg-orange-50' },
            cyan: { text: 'text-cyan-500', bg: 'bg-cyan-50' },
            amber: { text: 'text-amber-500', bg: 'bg-amber-50' },
            gray: { text: 'text-gray-500', bg: 'bg-gray-50' },
            red: { text: 'text-red-500', bg: 'bg-red-50' },
        }
        return colorMap[color] || colorMap.gray
    }

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('catalog.buttons.manage_categories')}
                    </Button>
                </SheetTrigger>
                <SheetContent
                    side="right"
                    className="
                        sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                        mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                        data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                        bg-transparent
                    "
                >
                    <SheetHeader className="hidden">
                        <SheetTitle>{t('catalog.categories.sheet_title')}</SheetTitle>
                        <SheetDescription>{t('catalog.categories.sheet_desc')}</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                        {/* Header */}
                        <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                                    <LucideIcons.FolderOpen className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('catalog.categories.manager_title')}</h2>
                                    <p className="text-xs text-muted-foreground">{t('catalog.categories.manager_subtitle')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-full">
                                <div className="p-8 pb-24">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="animate-pulse flex flex-col items-center">
                                                <div className="h-12 w-12 bg-gray-100 rounded-full mb-4"></div>
                                                <div className="h-4 w-32 bg-gray-100 rounded"></div>
                                            </div>
                                        </div>
                                    ) : categories.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                            <LucideIcons.FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                {t('catalog.categories.empty_title')}
                                            </p>
                                            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-6">
                                                {t('catalog.categories.empty_desc')}
                                            </p>
                                            <Button onClick={handleCreateNew} variant="outline">
                                                {t('catalog.categories.create_first')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {categories.map((category) => {
                                                const IconComponent = getIcon(category.icon)
                                                // Simplified colors for modern look
                                                const colors = getColorClasses(category.color)

                                                return (
                                                    <div
                                                        key={category.id}
                                                        className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <GripVertical className="h-4 w-4" />
                                                            </div>

                                                            <div className={`p-3 rounded-xl ${colors.bg}`}>
                                                                <IconComponent className={`h-5 w-5 ${colors.text}`} />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-gray-900 truncate">
                                                                    {category.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-gray-100 text-gray-500 border-transparent">
                                                                        {category.color}
                                                                    </Badge>
                                                                    <span>•</span>
                                                                    <span className="font-mono">{category.icon}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                                                                onClick={() => handleEdit(category)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                                onClick={() => handleDelete(category.id, category.name)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.actions.back')}</Button>
                            <Button
                                onClick={handleCreateNew}
                                size="sm"
                                className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-lg shadow-gray-200"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {t('catalog.categories.new_title')}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet >

            <CategoryFormSheet
                open={formOpen}
                onOpenChange={setFormOpen}
                category={editingCategory}
                onSuccess={handleFormSuccess}
            />
        </>
    )
}
