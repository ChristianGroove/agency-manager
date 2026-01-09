"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Package, Plus, Loader2, ShoppingCart, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchCatalog } from "../deal-actions"
import { cn } from "@/lib/utils"

interface Product {
    id: string
    name: string
    base_price: number
    image_url?: string
    category?: string
    metadata?: any
}

interface ProductSelectorProps {
    onSelect: (product: Product) => void
}

export function ProductSelector({ onSelect }: ProductSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const inputRef = useRef<HTMLInputElement>(null)

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) runSearch()
        }, 300)
        return () => clearTimeout(timer)
    }, [query, selectedCategory, isOpen])

    const runSearch = async () => {
        setLoading(true)
        const res = await searchCatalog(query, selectedCategory)
        if (res.success && res.data) {
            setResults(res.data)
        }
        setLoading(false)
    }

    const categories = [
        { id: 'all', label: 'Todo' },
        { id: 'services', label: 'Servicios' },
        { id: 'products', label: 'Productos' },
        { id: 'subscriptions', label: 'Suscripciones' }
    ]

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-muted-foreground border-dashed h-9 bg-muted/50 hover:bg-muted hover:text-foreground transition-colors" onClick={() => setIsOpen(true)}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Agregar Producto...
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[320px] sm:w-[380px]" align="start" sideOffset={8}>
                <div className="flex flex-col h-[400px]">
                    {/* Header: Search */}
                    <div className="p-3 border-b flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Buscar en catálogo..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                    </div>

                    {/* Categories Strip */}
                    <div className="px-2 py-2 border-b bg-muted/20 flex gap-1 overflow-x-auto no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] rounded-full font-medium transition-colors whitespace-nowrap border",
                                    selectedCategory === cat.id
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Results Grid */}
                    <ScrollArea className="flex-1">
                        <div className="p-2 grid grid-cols-1 gap-1">
                            {results.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                                    <Package className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground">No se encontraron productos</p>
                                </div>
                            )}

                            {results.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        onSelect(product)
                                        setIsOpen(false)
                                    }}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left group transition-colors border border-transparent hover:border-border"
                                >
                                    {/* Thumbnail */}
                                    <div className="h-10 w-10 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-border/50">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="h-4 w-4 text-muted-foreground/40" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">{product.name}</h4>
                                            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                ${product.base_price.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded-[4px] font-normal text-muted-foreground">
                                                {product.category || 'General'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Floating Footer if needed */}
                    <div className="p-2 border-t bg-muted/20 text-[10px] text-center text-muted-foreground">
                        Mostrando {results.length} resultados
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
