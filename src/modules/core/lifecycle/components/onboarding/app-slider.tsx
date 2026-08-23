"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Lock, Sparkles, ArrowRight, ArrowLeft, Check, 
    Rocket, Briefcase, Package, ShoppingCart, 
    Utensils, Brush, Monitor, Layout, Building2
} from "lucide-react"

/**
 * Mapa de iconos de Lucide soportados dinámicamente.
 * Permite que el SaaS Engine especifique nombres de iconos en texto.
 */
const IconMap: Record<string, any> = {
    'Sparkles': Sparkles,
    'Rocket': Rocket,
    'Briefcase': Briefcase,
    'Package': Package,
    'ShoppingCart': ShoppingCart,
    'Utensils': Utensils,
    'Brush': Brush,
    'Monitor': Monitor,
    'Layout': Layout,
    'Building2': Building2
}

interface App {
    id: string
    name: string
    description: string
    icon?: string
    color?: string
    is_active?: boolean
}

interface AppSliderProps {
    apps: App[]
    selectedAppId: string
    onSelect: (appId: string) => void
    primaryColor: string
}

export function AppSlider({ apps, selectedAppId, onSelect, primaryColor }: AppSliderProps) {
    const initialIndex = apps.findIndex(app => app.id === selectedAppId)
    const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

    const handleNext = () => {
        const nextIndex = (activeIndex + 1) % apps.length
        setActiveIndex(nextIndex)
        onSelect(apps[nextIndex].id)
    }

    const handlePrev = () => {
        const prevIndex = (activeIndex - 1 + apps.length) % apps.length
        setActiveIndex(prevIndex)
        onSelect(apps[prevIndex].id)
    }

    const activeApp = apps[activeIndex]
    const activeAppId = activeApp?.id

    useEffect(() => {
        if (activeAppId && activeAppId !== selectedAppId) {
            onSelect(activeAppId)
        }
    }, [activeAppId, onSelect, selectedAppId])

    return (
        <div className="w-full h-[320px] flex items-center justify-center relative perspective-1000 overflow-visible">

            <AnimatePresence mode="popLayout">
                {apps.map((app, index) => {
                    let offset = index - activeIndex;

                    if (apps.length > 1) {
                        if (offset > apps.length / 2) offset -= apps.length;
                        else if (offset < -apps.length / 2) offset += apps.length;
                    }

                    const isCenter = offset === 0;
                    
                    // Logic: Todas las apps registradas en el SaaS Engine que lleguen aquí se consideran disponibles
                    const isAvailable = app.id.startsWith('app_') 
                    
                    // Obtener componente de icono dinámico con fallback a Package
                    const IconComponent = IconMap[app.icon || 'Package'] || Package

                    if (Math.abs(offset) > 1) return null;

                    return (
                        <motion.div
                            key={app.id}
                            layoutId={app.id}
                            className={`
                                absolute w-[260px] h-[260px] rounded-3xl p-5 flex flex-col justify-between 
                                cursor-grab active:cursor-grabbing transition-shadow duration-500
                                ${isCenter ? 'z-20' : 'z-10'}
                                ${isCenter ? 'shadow-2xl' : ''}
                            `}
                            style={{
                                background: 'white',
                                border: isCenter ? `2px solid ${app.color || primaryColor}` : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: isCenter
                                    ? `0 25px 50px -12px ${app.color || primaryColor}40`
                                    : '0 10px 20px -10px rgba(0,0,0,0.1)',
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: isCenter ? 1 : 0.85,
                                x: offset * 180, 
                                y: isCenter ? 0 : 20, 
                                opacity: isCenter ? 1 : 0.1, 
                                filter: isCenter ? 'blur(0px)' : 'blur(2px)', 
                                zIndex: isCenter ? 20 : 10,
                                rotateY: offset * -15 
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset: xOffset, velocity }) => {
                                const swipe = xOffset.x;
                                if (swipe < -50 || velocity.x < -500) {
                                    handleNext();
                                } else if (swipe > 50 || velocity.x > 500) {
                                    handlePrev();
                                }
                            }}
                            onClick={() => {
                                if (offset !== 0) {
                                    if (offset > 0) handleNext();
                                    else handlePrev();
                                }
                            }}
                        >
                            <div className="flex flex-col items-center h-full relative">
                                <div className="absolute top-0 right-0">
                                    <div className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Disponible
                                    </div>
                                </div>

                                <div
                                    className="mt-4 mb-3 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg text-white"
                                    style={{
                                        backgroundColor: app.color || primaryColor,
                                        background: `linear-gradient(135deg, ${app.color || primaryColor}, ${app.color || primaryColor}dd)`
                                    }}
                                >
                                    <IconComponent className="h-7 w-7" />
                                </div>

                                <div className="text-center flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 px-2">
                                        {app.name}
                                    </h3>
                                    {isCenter && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-xs text-gray-400 leading-relaxed px-1 line-clamp-3"
                                        >
                                            {app.description}
                                        </motion.p>
                                    )}
                                </div>

                                {isCenter && (
                                    <div className="mt-auto pt-4">
                                        <div
                                            className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-900"
                                            style={{ color: app.color || primaryColor }}
                                        >
                                            <Check className="h-5 w-5" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>

            {/* Navigation Buttons (Optional but helpful for desktop) */}
            <button
                onClick={handlePrev}
                className="absolute left-0 z-30 p-2 rounded-full hover:bg-white/20 transition-colors text-gray-400 hover:text-gray-900"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>

            <button
                onClick={handleNext}
                className="absolute right-0 z-30 p-2 rounded-full hover:bg-white/20 transition-colors text-gray-400 hover:text-gray-900"
            >
                <ArrowRight className="w-6 h-6" />
            </button>

        </div>
    )
}
