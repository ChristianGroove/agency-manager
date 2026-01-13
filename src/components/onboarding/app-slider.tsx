"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react"

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
    // Find the index of the selected app to initialize or default to 0
    const initialIndex = apps.findIndex(app => app.id === selectedAppId)
    const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

    const handleNext = () => {
        const nextIndex = (activeIndex + 1) % apps.length
        setActiveIndex(nextIndex)
        // Auto-select if it's the active system active (optional, keeping logic separate for now but user implied navigation selects)
        // But let's keep selection explicit or auto? "se posicione la siguiente alfrente".
        // I'll update parent selection if the new card is "active" system-wise.
        const app = apps[nextIndex]
        if (app.id === 'app_marketing_starter') onSelect(app.id)
    }

    const handlePrev = () => {
        const prevIndex = (activeIndex - 1 + apps.length) % apps.length
        setActiveIndex(prevIndex)
        const app = apps[prevIndex]
        if (app.id === 'app_marketing_starter') onSelect(app.id)
    }

    // Update parent when index changes if valid
    // Derived state for the effect
    const activeApp = apps[activeIndex]
    const activeAppId = activeApp?.id

    // Update parent when activeAppId changes
    useEffect(() => {
        // Check if the generic app is the one we want to auto-select (Marketing Starter)
        if (activeAppId === 'app_marketing_starter') {
            // Prevent infinite loop: Only notify parent if selection actually changed
            if (activeAppId !== selectedAppId) {
                onSelect(activeAppId)
            }
        }
    }, [activeAppId, onSelect, selectedAppId])

    return (
        <div className="w-full h-[320px] flex items-center justify-center relative perspective-1000 overflow-visible">

            <AnimatePresence mode="popLayout">
                {apps.map((app, index) => {
                    // Circular distance logic
                    // We only want to show Prev, Current, Next. Others hidden.

                    let offset = index - activeIndex;
                    // Handle wrap-around for visual continuity if needed, 
                    // but for 3 items (Agency, Cleaning, Consulting) straightforward math is fine.
                    // If we have many items, we'd need cleaner circular logic.
                    // Given the small set, let's keep it simple: 
                    // 0 is center, -1 is left, 1 is right.

                    if (apps.length > 1) {
                        // Adjust offset to be shortest path in a circle? 
                        // For 3 items: 0, 1, 2. If active=0. 1 is +1 (right), 2 is -1 (left).
                        if (offset > apps.length / 2) offset -= apps.length;
                        else if (offset < -apps.length / 2) offset += apps.length;
                    }

                    const isCenter = offset === 0;
                    const isSystemActive = app.id === 'app_marketing_starter';

                    // Only render visible range (+/- 1) to keep it clean, or ALL but hidden
                    if (Math.abs(offset) > 1) return null;

                    return (
                        <motion.div
                            key={app.id}
                            layoutId={app.id}
                            className={`
                                absolute w-[260px] h-[260px] rounded-3xl p-5 flex flex-col justify-between 
                                cursor-grab active:cursor-grabbing transition-shadow duration-500
                                ${isCenter ? 'z-20' : 'z-10'}
                                ${isCenter && isSystemActive ? 'shadow-2xl' : ''}
                            `}
                            style={{
                                background: 'white',
                                border: isCenter && isSystemActive ? `2px solid ${primaryColor}` : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: isCenter && isSystemActive
                                    ? `0 25px 50px -12px ${primaryColor}40`
                                    : '0 10px 20px -10px rgba(0,0,0,0.1)',
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: isCenter ? 1 : 0.85,
                                x: offset * 180, // Distance between cards
                                y: isCenter ? 0 : 20, // Side cards slightly down
                                opacity: isCenter ? 1 : 0.1, // 10% opacity for others
                                filter: isCenter ? 'blur(0px)' : 'blur(2px)', // Blur inactive
                                zIndex: isCenter ? 20 : 10,
                                rotateY: offset * -15 // Rotate inward
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
                                // Click to nav if side card
                                if (offset !== 0) {
                                    if (offset > 0) handleNext();
                                    else handlePrev();
                                }
                            }}
                        >
                            {/* Inner Content - Square Compact */}
                            <div className="flex flex-col items-center h-full relative">
                                {/* Badge */}
                                <div className="absolute top-0 right-0">
                                    {isSystemActive ? (
                                        <div className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                            Disponible
                                        </div>
                                    ) : (
                                        <div className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            Pronto
                                        </div>
                                    )}
                                </div>

                                {/* Icon */}
                                <div
                                    className="mt-4 mb-3 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg text-white"
                                    style={{
                                        backgroundColor: isSystemActive ? (app.color || primaryColor) : '#9ca3af',
                                        background: isSystemActive
                                            ? `linear-gradient(135deg, ${app.color || primaryColor}, ${app.color || primaryColor}dd)`
                                            : '#9ca3af'
                                    }}
                                >
                                    <Sparkles className="h-7 w-7" />
                                </div>

                                <div className="text-center flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 px-2">
                                        {app.id === 'app_marketing_starter' ? 'Agencia de Marketing' :
                                            app.id === 'app_cleaning_pro' ? 'Limpieza Profesional' :
                                                app.id === 'app_consulting_essential' ? 'Consultoría Integral' : app.name}
                                    </h3>
                                    {isCenter && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-xs text-gray-400 leading-relaxed px-1 line-clamp-3"
                                        >
                                            {isCenter && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-xs text-gray-400 leading-relaxed px-1 line-clamp-3"
                                                >
                                                    {isSystemActive
                                                        ? "Todo lo que necesitas para gestionar tu agencia de marketing."
                                                        : "Próximamente disponible. Únete a la lista de espera."}
                                                </motion.p>
                                            )}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Bottom Indicator */}
                                {isCenter && isSystemActive && (
                                    <div className="mt-auto pt-4">
                                        <div
                                            className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-900"
                                            style={{ color: primaryColor }}
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
