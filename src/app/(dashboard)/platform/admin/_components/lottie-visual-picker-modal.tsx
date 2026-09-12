"use client"

import React, { useState, useEffect, useMemo, memo } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Check, Sparkles, X, PlayCircle, Loader2 } from "lucide-react"
import lottieCatalog from "./lottie-catalog.json"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

const jsonCache = new Map<string, any>()

const CATEGORIES = [
    { key: "all", label: "Todos (214)" },
    { key: "business", label: "Negocios & Ventas" },
    { key: "support", label: "Soporte & Clientes" },
    { key: "food", label: "Restaurantes & Comida" },
    { key: "delivery", label: "Delivery & Envíos" },
    { key: "work", label: "Oficina & Equipos" },
    { key: "services", label: "Servicios & Limpieza" },
    { key: "health", label: "Salud & Bienestar" },
    { key: "education", label: "Educación & Libros" },
]

interface LottieItem {
    label: string
    value: string
    filename: string
    category: string
}

const LottieThumbnail = memo(function LottieThumbnail({
    item,
    isSelected,
    onSelect
}: {
    item: LottieItem
    isSelected: boolean
    onSelect: (value: string) => void
}) {
    const [animationData, setAnimationData] = useState<any>(() => jsonCache.get(item.value) || null)
    const [loading, setLoading] = useState(!jsonCache.has(item.value))

    useEffect(() => {
        if (jsonCache.has(item.value)) {
            setAnimationData(jsonCache.get(item.value))
            setLoading(false)
            return
        }

        let isMounted = true
        fetch(item.value)
            .then(res => res.json())
            .then(data => {
                jsonCache.set(item.value, data)
                if (isMounted) {
                    setAnimationData(data)
                    setLoading(false)
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [item.value])

    return (
        <button
            type="button"
            onClick={() => onSelect(item.value)}
            className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md"
                    : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80 shadow-sm"
            }`}
        >
            {/* Selected Badge */}
            {isSelected && (
                <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1 shadow">
                    <Check className="h-3 w-3" />
                </div>
            )}

            {/* Animation Player Preview */}
            <div className="w-full h-28 flex items-center justify-center relative overflow-hidden rounded-lg bg-slate-50 dark:bg-black/20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                        <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
                        <span className="text-[10px]">Cargando...</span>
                    </div>
                ) : animationData ? (
                    <Lottie
                        animationData={animationData}
                        loop={true}
                        autoplay={true}
                        className="w-full h-full object-contain p-1"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <PlayCircle className="h-6 w-6 opacity-40" />
                        <span className="text-[10px] mt-1">Lottie JSON</span>
                    </div>
                )}
            </div>

            {/* Title / Description */}
            <div className="w-full mt-2">
                <p className="text-xs font-medium text-slate-800 dark:text-zinc-200 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {item.label}
                </p>
                <span className="text-[10px] text-muted-foreground font-mono block truncate mt-0.5 opacity-70">
                    {item.filename.split('-2025')[0] || item.filename}
                </span>
            </div>
        </button>
    )
})

interface LottieVisualPickerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedValue?: string
    onSelect: (value: string) => void
}

export function LottieVisualPickerModal({
    open,
    onOpenChange,
    selectedValue,
    onSelect
}: LottieVisualPickerModalProps) {
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")

    const filteredItems = useMemo(() => {
        return (lottieCatalog as LottieItem[]).filter(item => {
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
            if (!matchesCategory) return false

            if (!search.trim()) return true
            const q = search.toLowerCase()
            return item.label.toLowerCase().includes(q) || item.filename.toLowerCase().includes(q)
        })
    }, [search, selectedCategory])

    const handleItemSelect = (val: string) => {
        onSelect(val)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border bg-white dark:bg-zinc-950">
                <DialogHeader className="p-5 pb-3 border-b bg-slate-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                Galería de Animaciones Lottie 3D
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                Selecciona una animación en miniatura con vista previa en tiempo real para inyectar en tu banner.
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                            {filteredItems.length} animaciones
                        </Badge>
                    </div>

                    {/* Search Input */}
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por palabra clave: soporte, delivery, burger, reloj, doctor, reunión, finanzas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-9 h-10 text-sm bg-white dark:bg-zinc-900"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <Button
                                key={cat.key}
                                type="button"
                                variant={selectedCategory === cat.key ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.key)}
                                className="h-7 text-xs px-2.5 rounded-full shrink-0"
                            >
                                {cat.label}
                            </Button>
                        ))}
                    </div>
                </DialogHeader>

                {/* Grid of Lottie Cards */}
                <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="font-semibold text-sm">No se encontraron animaciones</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Intenta buscar con otro término o selecciona otra categoría.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                                className="mt-4"
                            >
                                Restablecer filtros
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {filteredItems.map(item => (
                                <LottieThumbnail
                                    key={item.value}
                                    item={item}
                                    isSelected={selectedValue === item.value}
                                    onSelect={handleItemSelect}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 border-t bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-muted-foreground px-5">
                    <span>Haz clic en cualquier miniatura para asignarla al banner actual.</span>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
