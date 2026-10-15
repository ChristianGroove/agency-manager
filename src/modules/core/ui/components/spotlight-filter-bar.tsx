"use client"

/**
 * SpotlightFilterBar
 * ------------------------------------------------------------------
 * Combobox compacto (búsqueda + filtros) inspirado en macOS Spotlight.
 *
 * Características clave:
 * 1. Búsqueda y placeholder dinámico:
 *    - Icono de búsqueda limpio a la izquierda.
 *    - El filtro activo no satura el input con badges: se refleja en el
 *      texto dinámico del placeholder en estado de reposo (ej: "Activas › Bloqueadas 3 · Buscar...").
 *    - Al pasar el cursor por cualquier filtro, el placeholder previsualiza en tiempo real
 *      el nombre y la cantidad de registros con animación fluida `popLayout`.
 * 2. Ranura de acción intuitiva a la derecha:
 *    - Si hay texto: botón "X" limpia el texto de búsqueda.
 *    - Si hay filtro activo: el icono de filtro se transforma en botón "X" interactivo
 *      que restablece el filtro a "Todas" con un solo clic.
 *    - En reposo: icono sutil `ListFilter`.
 * 3. Subfiltros con morfismo continuo in-place:
 *    - El botón padre con sub-opciones no abre popovers externos ni botones marcados.
 *    - El propio contenedor extiende su cápsula verticalmente (hacia arriba o abajo según
 *      espacio disponible), conservando su anillo de color activo sin strokes estáticos debajo.
 * 4. Tooltips modernos Radix UI:
 *    - Cada burbuja cuenta con tooltip flotante (`@/components/ui/tooltip`) mostrando
 *      exclusivamente el nombre del filtro (sin números de ítems) para evitar el cruce
 *      de miradas en pantallas anchas.
 * 5. Temporizador de cortesía de 2 segundos:
 *    - Al retirar el cursor o limpiar el filtro, la bandeja espera 2000 ms antes de retraerse,
 *      evitando cierres abruptos por movimientos accidentales del cursor.
 */

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ListFilter, Search, X } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type IconType = React.ComponentType<{ className?: string }>

export interface SpotlightFilterSubOption {
    id: string
    label: string
    count?: number
    color?: string
    icon?: IconType
}

export interface SpotlightFilterOption {
    id: string
    label: string
    count?: number
    /** 'gray' | 'red' | 'amber' | 'emerald' | 'slate' | 'blue' | 'purple' | 'pink' | 'indigo' | 'orange' | 'cyan' | 'sky' */
    color?: string
    icon?: IconType
    subOptions?: SpotlightFilterSubOption[]
}

interface SpotlightFilterBarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filters: SpotlightFilterOption[]
    activeFilter?: string
    onFilterChange?: (filterId: string) => void
    defaultShowFilters?: boolean
    className?: string
}

const GAP = 10

type HoverTarget = { label: string; count?: number; color: string; icon?: IconType }

function resolveActiveFilter(filters: SpotlightFilterOption[], activeId: string) {
    for (const filter of filters) {
        if (filter.id === activeId) return { parent: filter, sub: undefined as SpotlightFilterSubOption | undefined }
        const sub = filter.subOptions?.find((option) => option.id === activeId)
        if (sub) return { parent: filter, sub }
    }
    return null
}

export function SpotlightFilterBar({
    searchTerm,
    onSearchChange,
    searchPlaceholder = "Buscar...",
    filters,
    activeFilter,
    onFilterChange,
    className,
}: SpotlightFilterBarProps) {
    const reduceMotion = useReducedMotion()

    const rootRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const trayInnerRef = useRef<HTMLDivElement>(null)
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [hovered, setHovered] = useState(false)
    const [focusWithin, setFocusWithin] = useState(false)
    const [openGroup, setOpenGroup] = useState<string | null>(null)
    const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null)

    // Ancho matemático constante para la bandeja (cada burbuja mide 40px + 10px gap):
    // Esto previene que el componente completo brinque o se anchee al alternar filtros
    const trayWidth = filters.length ? filters.length * 40 + (filters.length - 1) * GAP + GAP : 0

    const expanded = hovered || (focusWithin && !searchTerm)

    // ---------- Resolución del filtro activo ----------
    const defaultId: string = filters.some((f) => f.id === "all") ? "all" : (filters[0]?.id ?? "all")
    const currentActiveId =
        activeFilter || (filters.some((f) => f.id === "active") ? "active" : defaultId)

    const active = resolveActiveFilter(filters, currentActiveId)

    const hasActiveFilter = !!active && currentActiveId !== defaultId
    const activeTarget: HoverTarget | null = active
        ? active.sub
            ? {
                  label: `${active.parent.label} › ${active.sub.label}`,
                  count: active.sub.count,
                  color: active.sub.color || active.parent.color || "gray",
                  icon: active.sub.icon || active.parent.icon,
              }
            : {
                  label: active.parent.label,
                  count: active.parent.count,
                  color: active.parent.color || "gray",
                  icon: active.parent.icon,
              }
        : null

    useEffect(
        () => () => {
            if (leaveTimer.current) clearTimeout(leaveTimer.current)
        },
        []
    )

    // ---------- Handlers ----------
    const handleMouseEnter = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current)
        setHovered(true)
    }

    const handleMouseLeave = (e: React.MouseEvent) => {
        if (e.relatedTarget instanceof Node && rootRef.current?.contains(e.relatedTarget)) return
        if (rootRef.current?.contains(document.activeElement)) {
            setHovered(false)
            return
        }
        if (leaveTimer.current) clearTimeout(leaveTimer.current)
        leaveTimer.current = setTimeout(() => {
            setHovered(false)
            setHoverTarget(null)
            setOpenGroup(null)
        }, 2000)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== "Escape") return
        if (openGroup) {
            setOpenGroup(null)
            return
        }
        setHovered(false)
        setHoverTarget(null)
        setFocusWithin(false)
        if (document.activeElement instanceof HTMLElement && rootRef.current?.contains(document.activeElement)) {
            document.activeElement.blur()
        }
    }

    const select = (id: string) => {
        onFilterChange?.(id === currentActiveId ? defaultId : id)
    }

    const clearFilter = () => {
        onFilterChange?.(defaultId)
        setHoverTarget(null)
        setOpenGroup(null)
        setFocusWithin(false)
        inputRef.current?.blur()
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        if (leaveTimer.current) clearTimeout(leaveTimer.current)
        leaveTimer.current = setTimeout(() => {
            setHovered(false)
        }, 2000)
    }

    // ---------- Placeholder ----------
    const placeholderTarget = hoverTarget ?? (hasActiveFilter ? activeTarget : null)
    const placeholderKey = hoverTarget
        ? `h-${hoverTarget.label}`
        : hasActiveFilter
          ? `a-${currentActiveId}`
          : "default"

    const spring = reduceMotion
        ? { duration: 0.12 }
        : ({ type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const)

    const bubbleTransition = (index: number) =>
        reduceMotion ? { duration: 0.12 } : { type: "spring" as const, stiffness: 480, damping: 34, delay: index * 0.03 }

    return (
        <div
            ref={rootRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            onFocusCapture={() => {
                if (leaveTimer.current) clearTimeout(leaveTimer.current)
                setFocusWithin(true)
            }}
            onBlurCapture={(e) => {
                if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) {
                    setFocusWithin(false)
                }
            }}
            className={cn("relative flex items-center flex-1 min-w-0 max-w-full", className)}
        >
            {/* ---------------- Barra de Búsqueda ---------------- */}
            <div
                className={cn(
                    "relative z-10 flex items-center gap-2 h-10 pl-2 pr-3 flex-1 min-w-[150px] rounded-full",
                    "bg-white dark:bg-zinc-900 ring-1 ring-zinc-200/80 dark:ring-white/10 shadow-sm transition-shadow duration-200",
                    expanded && "shadow-md"
                )}
                onClick={() => inputRef.current?.focus()}
            >
                {/* Icono de búsqueda fijo y limpio */}
                <span className="h-7 w-7 shrink-0 flex items-center justify-center">
                    <Search className="h-4 w-4 text-zinc-400" />
                </span>

                {/* Input + placeholder dinámico con animación popLayout */}
                <div className="relative flex-1 min-w-0 h-full flex items-center">
                    {!searchTerm && (
                        <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={placeholderKey}
                                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                    className="flex items-center gap-1.5 text-sm min-w-0 whitespace-nowrap"
                                >
                                    {placeholderTarget ? (
                                        <>
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200 truncate">
                                                {placeholderTarget.label}
                                            </span>
                                            {placeholderTarget.count !== undefined && (
                                                <span
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none shrink-0",
                                                        getCountStyles(placeholderTarget.color)
                                                    )}
                                                >
                                                    {placeholderTarget.count}
                                                </span>
                                            )}
                                            {!hoverTarget && (
                                                <span className="text-zinc-400 truncate">· {searchPlaceholder}</span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-zinc-400 truncate">{searchPlaceholder}</span>
                                    )}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        aria-label={searchPlaceholder}
                        className="relative w-full h-full bg-transparent border-0 outline-none focus:ring-0 text-sm text-zinc-700 dark:text-white min-w-0"
                    />
                </div>

                {searchTerm ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSearchChange("")
                                    inputRef.current?.focus()
                                }}
                                className="h-6 w-6 -mr-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 shrink-0 cursor-pointer transition-colors"
                                aria-label="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Limpiar búsqueda
                        </TooltipContent>
                    </Tooltip>
                ) : hasActiveFilter ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    clearFilter()
                                }}
                                className="h-6 w-6 -mr-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0 cursor-pointer transition-colors"
                                aria-label="Quitar filtro"
                            >
                                <X className="h-3.5 w-3.5 stroke-[2.2]" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Quitar filtro
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    filters.length > 0 && (
                        <ListFilter
                            aria-hidden="true"
                            className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                                expanded ? "text-zinc-400" : "text-zinc-300 dark:text-zinc-600"
                            )}
                        />
                    )
                )}
            </div>

            {/* ---------------- Bandeja de Filtros (Burbujas) ---------------- */}
            <motion.div
                initial={false}
                animate={{ width: expanded ? trayWidth : 0 }}
                transition={spring}
                className={cn("relative h-12 shrink-0", expanded ? "overflow-visible" : "overflow-hidden")}
                aria-hidden={!expanded}
            >
                <TooltipProvider delayDuration={150}>
                    <div
                        ref={trayInnerRef}
                        className="absolute inset-y-0 left-0 flex items-center w-max"
                        style={{ gap: GAP, paddingLeft: GAP }}
                        onMouseLeave={() => setHoverTarget(null)}
                    >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {expanded &&
                            filters.map((f, index) => {
                                const subs = f.subOptions ?? []
                                const hasSubs = subs.length > 0
                                const tuck = -(index + 1) * 50

                                if (hasSubs) {
                                    return (
                                        <motion.div
                                            key={f.id}
                                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: tuck }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: tuck }}
                                            transition={bubbleTransition(index)}
                                            className="shrink-0"
                                        >
                                            <MorphingFilterCapsule
                                                filter={f}
                                                currentActiveId={currentActiveId}
                                                isGroupOpen={openGroup === f.id}
                                                reduceMotion={!!reduceMotion}
                                                onOpen={() => setOpenGroup(f.id)}
                                                onClose={() => setOpenGroup((g) => (g === f.id ? null : g))}
                                                onHover={setHoverTarget}
                                                onSelect={select}
                                            />
                                        </motion.div>
                                    )
                                }

                                const isActive = currentActiveId === f.id
                                const color = f.color || "gray"

                                return (
                                    <motion.div
                                        key={f.id}
                                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: tuck }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: tuck }}
                                        transition={bubbleTransition(index)}
                                        className="shrink-0"
                                    >
                                        <StandardBubbleButton
                                            icon={f.icon}
                                            label={f.label}
                                            color={color}
                                            isActive={isActive}
                                            count={f.count}
                                            onHover={() => {
                                                setOpenGroup(null)
                                                setHoverTarget({
                                                    label: f.label,
                                                    count: f.count,
                                                    color,
                                                    icon: f.icon,
                                                })
                                            }}
                                            onSelect={() => select(f.id)}
                                        />
                                    </motion.div>
                                )
                            })}
                    </AnimatePresence>
                </div>
            </TooltipProvider>
        </motion.div>
        </div>
    )
}

// ------------------------------------------------------------------
// Morphing Filter Capsule (Filtro con subopciones que se extiende in-place)
// ------------------------------------------------------------------

interface MorphingFilterCapsuleProps {
    filter: SpotlightFilterOption
    currentActiveId: string
    isGroupOpen: boolean
    reduceMotion: boolean
    onOpen: () => void
    onClose: () => void
    onHover: (t: HoverTarget | null) => void
    onSelect: (id: string) => void
}

function MorphingFilterCapsule({
    filter,
    currentActiveId,
    isGroupOpen,
    reduceMotion,
    onOpen,
    onClose,
    onHover,
    onSelect,
}: MorphingFilterCapsuleProps) {
    const capsuleRef = useRef<HTMLDivElement>(null)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [dir, setDir] = useState<"down" | "up">("down")
    const keyboardOpen = useRef(false)

    useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
    }, [])

    useEffect(() => {
        if (!keyboardOpen.current) return
        if (isGroupOpen) {
            capsuleRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()
        } else {
            keyboardOpen.current = false
            capsuleRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus()
        }
    }, [isGroupOpen])

    const subs = filter.subOptions ?? []
    const activeSub = subs.find((s) => s.id === currentActiveId)
    const parentActive = currentActiveId === filter.id
    const isAnyActive = parentActive || !!activeSub

    // Color e icono que representan el filtro en reposo:
    const activeColor = activeSub?.color || (parentActive ? filter.color : undefined) || filter.color || "gray"
    const DisplayIcon = activeSub?.icon || filter.icon

    // Determinar si extender hacia abajo o hacia arriba según espacio
    const checkDirection = () => {
        if (!capsuleRef.current) return
        const r = capsuleRef.current.getBoundingClientRect()
        const totalHeight = 40 + 8 + subs.length * 34
        const below = window.innerHeight - r.bottom
        const above = r.top
        setDir(below >= totalHeight || below >= above ? "down" : "up")
    }

    const handleMouseEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        checkDirection()
        onOpen()
    }

    const handleMouseLeave = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        if (capsuleRef.current?.contains(document.activeElement)) return
        closeTimer.current = setTimeout(() => {
            onClose()
        }, 80)
    }

    const totalHeight = 40 + 8 + subs.length * 34

    return (
        <div
            ref={capsuleRef}
            className="relative size-10"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Cápsula morfológica única: el mismo contenedor extiende su altura */}
            <motion.div
                initial={false}
                animate={{
                    height: isGroupOpen ? totalHeight : 40,
                }}
                transition={
                    reduceMotion
                        ? { duration: 0.12 }
                        : { type: "spring", stiffness: 500, damping: 36, mass: 0.7 }
                }
                style={{
                    overflow: "hidden",
                    transformOrigin: dir === "down" ? "center top" : "center bottom",
                }}
                className={cn(
                    "absolute left-0 w-10 rounded-full select-none",
                    dir === "down" ? "top-0" : "bottom-0",
                    isGroupOpen ? "z-50 shadow-2xl py-0.5" : "z-10 shadow-sm",
                    "bg-white dark:bg-zinc-900 transition-colors duration-150",
                    // El borde/stroke adopta el color activo de forma continua y limpia
                    isAnyActive
                        ? getBubbleActiveStyles(activeColor)
                        : "ring-1 ring-zinc-200/80 dark:ring-white/10 text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:shadow-md"
                )}
            >
                {/* Estado colapsado (en reposo): exactamente un botón circular 40x40 */}
                {!isGroupOpen ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-expanded={false}
                                aria-haspopup="menu"
                                onKeyDown={(e) => {
                                    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
                                    e.preventDefault()
                                    keyboardOpen.current = true
                                    checkDirection()
                                    onOpen()
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelect(filter.id)
                                    onOpen()
                                }}
                                onMouseEnter={() =>
                                    onHover(
                                        activeSub
                                            ? {
                                                  label: `${filter.label} › ${activeSub.label}`,
                                                  count: activeSub.count,
                                                  color: activeColor,
                                                  icon: DisplayIcon,
                                              }
                                            : {
                                                  label: `Todas las ${filter.label.toLowerCase()}`,
                                                  count: filter.count,
                                                  color: activeColor,
                                                  icon: DisplayIcon,
                                              }
                                    )
                                }
                                aria-label={filter.label}
                                className="relative size-10 flex items-center justify-center cursor-pointer outline-none rounded-full"
                            >
                                {DisplayIcon ? (
                                    <DisplayIcon className="h-[18px] w-[18px] stroke-[1.8]" />
                                ) : (
                                    <span className="font-bold text-[13px] uppercase">{filter.label.charAt(0)}</span>
                                )}
                                {isAnyActive && (
                                    <span
                                        className={cn(
                                            "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                                            getDotColor(activeColor)
                                        )}
                                    />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {activeSub ? `${filter.label} › ${activeSub.label}` : filter.label}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    /* Estado expandido: contenedor extendido con iconos puros sin bordes anidados */
                    <div
                        className={cn("flex items-center w-full", dir === "down" ? "flex-col" : "flex-col-reverse")}
                        role="menu"
                        aria-label={filter.label}
                        onKeyDown={(e) => {
                            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
                            const items = Array.from(capsuleRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])
                            if (dir === 'up') items.reverse()
                            if (!items.length) return
                            e.preventDefault()
                            const current = items.indexOf(document.activeElement as HTMLButtonElement)
                            const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
                                : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
                            items[next]?.focus()
                        }}
                    >
                        {/* Opción Padre: "Todas las [filtro]" */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-label={`Todas las ${filter.label.toLowerCase()}`}
                                    aria-checked={parentActive}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSelect(filter.id)
                                        onClose()
                                    }}
                                    onMouseEnter={() =>
                                        onHover({
                                            label: `Todas las ${filter.label.toLowerCase()}`,
                                            count: filter.count,
                                            color: filter.color || "gray",
                                            icon: filter.icon,
                                        })
                                    }
                                    className={cn(
                                        "relative size-10 flex items-center justify-center rounded-full shrink-0 cursor-pointer transition-colors duration-150 outline-none",
                                        parentActive
                                            ? getIconActiveColor(filter.color || "gray")
                                            : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                                    )}
                                >
                                    {filter.icon ? (
                                        <filter.icon className="h-[18px] w-[18px] stroke-[1.8]" />
                                    ) : (
                                        <span className="font-bold text-[13px] uppercase">{filter.label.charAt(0)}</span>
                                    )}
                                    {parentActive && (
                                        <span
                                            className={cn(
                                                "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                                                getDotColor(filter.color || "gray")
                                            )}
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {`Todas las ${filter.label.toLowerCase()}`}
                            </TooltipContent>
                        </Tooltip>

                        {/* Divisor sutil y limpio */}
                        <div className="w-4 h-px bg-zinc-200/90 dark:bg-zinc-800/90 shrink-0 my-0.5" />

                        {/* Lista de sub-opciones como iconos limpios */}
                        {subs.map((s) => {
                            const sColor = s.color || filter.color || "gray"
                            const isSubActive = currentActiveId === s.id
                            const SubIcon = s.icon
                            return (
                                <Tooltip key={s.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-label={`${filter.label} › ${s.label}`}
                                            aria-checked={isSubActive}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onSelect(s.id)
                                                onClose()
                                            }}
                                            onMouseEnter={() =>
                                                onHover({
                                                    label: `${filter.label} › ${s.label}`,
                                                    count: s.count,
                                                    color: sColor,
                                                    icon: s.icon,
                                                })
                                            }
                                            className={cn(
                                                "relative w-full h-[34px] flex items-center justify-center rounded-full shrink-0 cursor-pointer transition-colors duration-150 outline-none",
                                                isSubActive
                                                    ? getIconActiveColor(sColor)
                                                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                                            )}
                                        >
                                            {SubIcon ? (
                                                <SubIcon className="h-4 w-4 stroke-[1.8]" />
                                            ) : (
                                                <span className="font-semibold text-[11px] uppercase">{s.label.charAt(0)}</span>
                                            )}
                                            {isSubActive && (
                                                <span
                                                    className={cn(
                                                        "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                                                        getDotColor(sColor)
                                                    )}
                                                />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {s.label}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ------------------------------------------------------------------
// Standard Bubble Button (Filtros simples sin subopciones)
// ------------------------------------------------------------------

interface StandardBubbleButtonProps {
    icon?: IconType
    label: string
    color: string
    isActive: boolean
    count?: number
    onHover: () => void
    onSelect: () => void
}

function StandardBubbleButton({
    icon: Icon,
    label,
    color,
    isActive,
    count,
    onHover,
    onSelect,
}: StandardBubbleButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onMouseEnter={onHover}
                    onFocus={onHover}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSelect()
                    }}
                    aria-label={count !== undefined ? `${label} (${count})` : label}
                    aria-pressed={isActive}
                    className={cn(
                        "relative size-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer",
                        "bg-white dark:bg-zinc-900 shadow-sm transition-[color,box-shadow] duration-150 outline-none",
                        "focus-visible:ring-2 focus-visible:ring-primary/50",
                        isActive
                            ? getBubbleActiveStyles(color)
                            : "ring-1 ring-zinc-200/80 dark:ring-white/10 text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:shadow-md"
                    )}
                >
                    {Icon ? (
                        <Icon className="h-[18px] w-[18px] stroke-[1.8]" />
                    ) : (
                        <span className="font-bold text-[13px] uppercase">{label.charAt(0)}</span>
                    )}
                    {isActive && (
                        <span
                            className={cn(
                                "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                                getDotColor(color)
                            )}
                        />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">
                {label}
            </TooltipContent>
        </Tooltip>
    )
}

// ------------------------------------------------------------------
// Estilos de Color
// ------------------------------------------------------------------

function getCountStyles(color: string) {
    switch (color) {
        case "red": return "bg-red-500/10 text-red-600 dark:text-red-400"
        case "amber": return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        case "emerald": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        case "slate": return "bg-slate-500/10 text-slate-600 dark:text-slate-300"
        case "blue": return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        case "sky": return "bg-sky-500/10 text-sky-600 dark:text-sky-400"
        case "purple": return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
        case "pink": return "bg-pink-500/10 text-pink-600 dark:text-brand-pink"
        case "indigo": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        case "orange": return "bg-orange-500/10 text-orange-600 dark:text-orange-400"
        case "cyan": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
        default: return "bg-primary/10 text-primary"
    }
}

function getBubbleActiveStyles(color: string) {
    switch (color) {
        case "red": return "ring-1 ring-red-500/40 text-red-600 dark:text-red-400"
        case "amber": return "ring-1 ring-amber-500/40 text-amber-600 dark:text-amber-400"
        case "emerald": return "ring-1 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400"
        case "slate": return "ring-1 ring-slate-500/40 text-slate-600 dark:text-slate-300"
        case "blue": return "ring-1 ring-blue-500/40 text-blue-600 dark:text-blue-400"
        case "sky": return "ring-1 ring-sky-500/40 text-sky-600 dark:text-sky-400"
        case "purple": return "ring-1 ring-purple-500/40 text-purple-600 dark:text-purple-400"
        case "pink": return "ring-1 ring-pink-500/40 text-pink-600 dark:text-brand-pink"
        case "indigo": return "ring-1 ring-indigo-500/40 text-indigo-600 dark:text-indigo-400"
        case "orange": return "ring-1 ring-orange-500/40 text-orange-600 dark:text-orange-400"
        case "cyan": return "ring-1 ring-cyan-500/40 text-cyan-600 dark:text-cyan-400"
        default: return "ring-1 ring-zinc-400/50 dark:ring-white/30 text-zinc-900 dark:text-white"
    }
}

function getIconActiveColor(color: string) {
    switch (color) {
        case "red": return "text-red-600 dark:text-red-400 font-semibold"
        case "amber": return "text-amber-600 dark:text-amber-400 font-semibold"
        case "emerald": return "text-emerald-600 dark:text-emerald-400 font-semibold"
        case "slate": return "text-slate-600 dark:text-slate-300 font-semibold"
        case "blue": return "text-blue-600 dark:text-blue-400 font-semibold"
        case "sky": return "text-sky-600 dark:text-sky-400 font-semibold"
        case "purple": return "text-purple-600 dark:text-purple-400 font-semibold"
        case "pink": return "text-pink-600 dark:text-brand-pink font-semibold"
        case "indigo": return "text-indigo-600 dark:text-indigo-400 font-semibold"
        case "orange": return "text-orange-600 dark:text-orange-400 font-semibold"
        case "cyan": return "text-cyan-600 dark:text-cyan-400 font-semibold"
        default: return "text-zinc-900 dark:text-white font-semibold"
    }
}

function getDotColor(color: string) {
    switch (color) {
        case "red": return "bg-red-500"
        case "amber": return "bg-amber-500"
        case "emerald": return "bg-emerald-500"
        case "slate": return "bg-slate-500"
        case "blue": return "bg-blue-500"
        case "sky": return "bg-sky-500"
        case "purple": return "bg-purple-500"
        case "pink": return "bg-pink-500"
        case "indigo": return "bg-indigo-500"
        case "orange": return "bg-orange-500"
        case "cyan": return "bg-cyan-500"
        default: return "bg-zinc-900 dark:bg-white"
    }
}
