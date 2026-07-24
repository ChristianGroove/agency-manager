"use client"

import React, { useState, useEffect } from 'react'
import { 
    Sparkles, 
    Palette, 
    LayoutGrid, 
    Megaphone, 
    Share2, 
    Save, 
    Check, 
    Sun, 
    Moon, 
    Smartphone, 
    Tag,
    Instagram,
    Facebook,
    Video,
    MessageCircle,
    Globe,
    MapPin,
    Link,
    HelpCircle,
    Clock,
    AlertOctagon,
    Plus,
    Trash2,
    Store,
    ShoppingBag,
    ReceiptText,
    User as UserIcon
} from 'lucide-react'
import { 
    PortalThemeConfig, 
    DEFAULT_PORTAL_THEME_CONFIG,
    DEFAULT_BUSINESS_SCHEDULE,
    DEFAULT_DAY_SCHEDULE,
    BusinessScheduleConfig,
    DaySchedule
} from '../types'
import { savePortalThemeConfig, getPortalThemeConfig } from '@/modules/features/menu/actions/theme-actions'
import { toast } from 'sonner'
import { PortalHeader } from './PortalHeader'
import { PortalPromoBanner } from './PortalPromoBanner'
import { PortalSocialFooter } from './PortalSocialFooter'
import { ScheduleModal } from './ScheduleModal'
import { CyberGlassBackground } from './CyberGlassBackground'
import { FloatingGlassDock } from './FloatingGlassDock'
import { PortalThemeProvider } from '../portal-theme-provider'
import { usePortalTheme } from '../use-portal-theme'
import { cn } from '@/modules/infrastructure/utils/utils'
import { ImageUpload } from '@/components/ui/image-upload'

// Sample Food Items for Live Preview
const PREVIEW_ITEMS = [
    {
        id: '1',
        name: 'Hamburguesa Trufada Gourmet',
        description: 'Pan brioche artesanal, doble carne Angus 150g, queso cheddar añejado, tocineta crujiente y mayo de trufa negra.',
        base_price: 34900,
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        is_available: true,
        category: { name: 'Hamburguesas Gourmet' }
    },
    {
        id: '2',
        name: 'Pizza Napolitana Burrata & Pesto',
        description: 'Masa madre de 48h de fermentación, salsa de tomate San Marzano, burrata fresca de búfala y pesto de albahaca.',
        base_price: 42000,
        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        is_available: true,
        category: { name: 'Pizzas Artesanales' }
    }
]

const DAYS_LIST = [
    { id: 1, label: 'Lunes', short: 'Lun' },
    { id: 2, label: 'Martes', short: 'Mar' },
    { id: 3, label: 'Miércoles', short: 'Mié' },
    { id: 4, label: 'Jueves', short: 'Jue' },
    { id: 5, label: 'Viernes', short: 'Vie' },
    { id: 6, label: 'Sábado', short: 'Sáb' },
    { id: 0, label: 'Domingo', short: 'Dom' },
    { id: 7, label: 'Festivos', short: 'Fest' },
]

export function PortalThemeCustomizer({ initialConfig, orgName }: { initialConfig?: PortalThemeConfig; orgName?: string }) {
    const [config, setConfig] = useState<PortalThemeConfig>(initialConfig || DEFAULT_PORTAL_THEME_CONFIG)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'theme' | 'cards' | 'banner' | 'schedule' | 'social'>('theme')
    const [selectedDay, setSelectedDay] = useState<number>(1) // 1 = Lun

    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig)
        } else {
            getPortalThemeConfig().then(res => {
                if (res) setConfig(res)
            })
        }
    }, [initialConfig])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await savePortalThemeConfig(config)
            if (res.success) {
                toast.success('¡Personalización del portal guardada con éxito!')
            } else {
                toast.error(res.error || 'Error al guardar los cambios')
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error inesperado al guardar')
        } finally {
            setSaving(false)
        }
    }

    const updateConfig = (updater: (prev: PortalThemeConfig) => PortalThemeConfig) => {
        setConfig(prev => updater(prev))
    }

    const scheduleConfig: BusinessScheduleConfig = config.schedule_config || DEFAULT_BUSINESS_SCHEDULE
    const dayConfig: DaySchedule = scheduleConfig.days?.[selectedDay] || DEFAULT_DAY_SCHEDULE

    return (
        <div className="w-full flex flex-col xl:flex-row gap-8 min-h-[750px] pb-12">
            
            {/* LEFT COLUMN: Controls Form */}
            <div className="flex-1 glass-panel bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> Personalizar Portal de Menú
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Ajusta el estilo visual, banner publicitario, horarios y redes sociales de tu carta pública.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 text-sm disabled:opacity-50"
                    >
                        {saving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

                {/* Sub-tabs Navigation */}
                <div className="flex overflow-x-auto gap-2 my-4 p-1 bg-gray-100/60 dark:bg-zinc-800/60 rounded-xl no-scrollbar">
                    <button
                        onClick={() => setActiveTab('theme')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === 'theme' ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <Palette className="w-4 h-4" /> Tema & Estilo
                    </button>

                    <button
                        onClick={() => setActiveTab('cards')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === 'cards' ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" /> Tarjetas de Platos
                    </button>

                    <button
                        onClick={() => setActiveTab('banner')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === 'banner' ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <Megaphone className="w-4 h-4" /> Banner Publicitario
                    </button>

                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === 'schedule' ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <Clock className="w-4 h-4" /> Horarios & Pedidos
                    </button>

                    <button
                        onClick={() => setActiveTab('social')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === 'social' ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <Share2 className="w-4 h-4" /> Redes & Contacto
                    </button>
                </div>

                {/* TAB 1: Theme & Palette */}
                {activeTab === 'theme' && (
                    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Tema Principal del Menú
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div
                                    onClick={() => updateConfig(c => ({ ...c, theme_id: 'modern_glass' }))}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                        config.theme_id === 'modern_glass'
                                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                            : "border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:border-gray-300"
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">Modern Glass</h4>
                                            {config.theme_id === 'modern_glass' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                        </div>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">Diseño limpio y cristalino translúcido.</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => updateConfig(c => ({ ...c, theme_id: 'gourmet_elegance' }))}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                        config.theme_id === 'gourmet_elegance'
                                            ? "border-amber-500 bg-amber-500/5 shadow-md ring-2 ring-amber-500/20"
                                            : "border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:border-gray-300"
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-extrabold text-xs text-amber-600 dark:text-amber-400 font-serif truncate">Gourmet Elegance</h4>
                                            {config.theme_id === 'gourmet_elegance' && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                        </div>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">Fondo oscuro profundo y bordes dorados.</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => updateConfig(c => ({ ...c, theme_id: 'cyber_glass_3d' }))}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                        config.theme_id === 'cyber_glass_3d'
                                            ? "border-cyan-500 bg-cyan-500/5 shadow-md ring-2 ring-cyan-500/20"
                                            : "border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:border-gray-300"
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-extrabold text-xs text-cyan-600 dark:text-cyan-400 truncate">3D Glass Dinámico</h4>
                                            {config.theme_id === 'cyber_glass_3d' && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                                        </div>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">Fondo 3D animado y halo futurista.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Estilo del Menú Inferior (Dock Flotante Universal)
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'floating_glass', label: 'Isla Glass Flotante', desc: 'Cristal satinado con blur y resplandor' },
                                    { id: 'capsule_pill', label: 'Cápsula Neón', desc: 'Compacto con resplandor neón' },
                                    { id: 'full_width_dock', label: 'Barra Ancha Flotante', desc: 'Borde a borde con indicador dinámico' },
                                ].map(dk => (
                                    <div
                                        key={dk.id}
                                        onClick={() => updateConfig(c => ({ ...c, dock_style: dk.id as any }))}
                                        className={cn(
                                            "p-3.5 rounded-2xl border cursor-pointer transition-all text-left",
                                            (config.dock_style || 'floating_glass') === dk.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/30"
                                        )}
                                    >
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white">{dk.label}</h5>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{dk.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Estilo de Navegación de Categorías
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'glass_cards', label: 'Isla Glass Satinada', desc: 'Tarjetas flotantes con blur prémium' },
                                    { id: 'pills', label: 'Cápsulas Redondas', desc: 'Badges redondeados clásicos' },
                                    { id: 'underline_tabs', label: 'Tabs Subrayados', desc: 'Línea de acento inferior' },
                                ].map(st => (
                                    <div
                                        key={st.id}
                                        onClick={() => updateConfig(c => ({ ...c, category_nav_style: st.id as any }))}
                                        className={cn(
                                            "p-3.5 rounded-2xl border cursor-pointer transition-all text-left",
                                            (config.category_nav_style || 'glass_cards') === st.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/30"
                                        )}
                                    >
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white">{st.label}</h5>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{st.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Variante del Logo de Marca en Encabezado
                            </label>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { id: 'auto', label: 'Automático', desc: 'Según tema claro/oscuro' },
                                    { id: 'main_dark', label: 'Logo Oscuro', desc: 'Usar logo oscuro' },
                                    { id: 'main_light', label: 'Logo Claro', desc: 'Usar logo blanco' },
                                    { id: 'portal_iso', label: 'Isotipo / Simbolo', desc: 'Usar solo el isotipo' },
                                ].map(lv => (
                                    <div
                                        key={lv.id}
                                        onClick={() => updateConfig(c => ({ ...c, logo_variant: lv.id as any }))}
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer transition-all text-left",
                                            (config.logo_variant || 'auto') === lv.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/30"
                                        )}
                                    >
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white">{lv.label}</h5>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{lv.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Eslogan de Cabecera Personalizado
                            </label>
                            <input
                                type="text"
                                value={config.header_footer?.custom_tagline || ''}
                                onChange={(e) => updateConfig(c => ({
                                    ...c,
                                    header_footer: { ...(c.header_footer || {}), custom_tagline: e.target.value } as any
                                }))}
                                placeholder="Ej: Disfruta de la mejor experiencia gastronómica"
                                className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 2: Dish Cards */}
                {activeTab === 'cards' && (
                    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Estilo de Tarjeta de Plato
                            </label>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { id: 'glass', label: 'Glassmorphism', desc: 'Fondo translúcido' },
                                    { id: 'bordered', label: 'Con Borde de Acento', desc: 'Borde sutil de marca' },
                                    { id: 'elevated', label: 'Elevado con Sombra', desc: 'Sombra 3D profunda' },
                                    { id: 'flat', label: 'Plano Minimalista', desc: 'Borde estándar fino' },
                                ].map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => updateConfig(c => ({ ...c, card_style: { ...c.card_style, variant: v.id as any } }))}
                                        className={cn(
                                            "p-3 rounded-2xl border cursor-pointer transition-all text-left",
                                            config.card_style.variant === v.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40"
                                        )}
                                    >
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white">{v.label}</h5>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{v.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 block">
                                Redondeo de Bordes (Border Radius)
                            </label>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'xl', label: 'Redondeado XL (12px)' },
                                    { id: '3xl', label: 'Redondeado 2XL (16px)' },
                                    { id: 'full', label: 'Súper Curvo (24px)' },
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => updateConfig(c => ({ ...c, card_style: { ...c.card_style, border_radius: r.id as any } }))}
                                        className={cn(
                                            "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                                            config.card_style.border_radius === r.id
                                                ? "border-primary bg-primary text-white shadow-sm"
                                                : "border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300"
                                        )}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Banner Publicitario */}
                {activeTab === 'banner' && (
                    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20">
                            <div>
                                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Activar Banner Promocional</h4>
                                <p className="text-xs text-gray-500">Muestra un banner panorámico publicitario en tu portal público.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={config.promo_banner?.enabled || false}
                                onChange={(e) => updateConfig(c => ({
                                    ...c,
                                    promo_banner: { ...(c.promo_banner || {}), enabled: e.target.checked } as any
                                }))}
                                className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer"
                            />
                        </div>

                        {config.promo_banner?.enabled && (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2 block">
                                        Imagen del Banner Publicitario
                                    </label>
                                    <ImageUpload
                                        value={config.promo_banner?.image_url || ''}
                                        onChange={(url) => updateConfig(c => ({
                                            ...c,
                                            promo_banner: { ...(c.promo_banner || {}), image_url: url } as any
                                        }))}
                                        label="Subir Imagen Panorámica del Banner"
                                        bucket="public-assets"
                                    />
                                    <div className="mt-3">
                                        <label className="text-[11px] text-gray-400 font-semibold mb-1 block">
                                            O también puedes pegar una URL directa de la imagen:
                                        </label>
                                        <input
                                            type="url"
                                            value={config.promo_banner?.image_url || ''}
                                            onChange={(e) => updateConfig(c => ({
                                                ...c,
                                                promo_banner: { ...(c.promo_banner || {}), image_url: e.target.value } as any
                                            }))}
                                            placeholder="https://ejemplo.com/banner-promocional.jpg"
                                            className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2 block">
                                        Texto de la Oferta / Leyenda del Banner (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={config.promo_banner?.alt_text || ''}
                                        onChange={(e) => updateConfig(c => ({
                                            ...c,
                                            promo_banner: { ...(c.promo_banner || {}), alt_text: e.target.value } as any
                                        }))}
                                        placeholder="Ej: 2x1 en Hamburguesas los Jueves (Dejar vacío para ocultar el badge)"
                                        className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2 block">
                                            Posición del Banner
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateConfig(c => ({ ...c, promo_banner: { ...(c.promo_banner || {}), position: 'top' } as any }))}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                                                    config.promo_banner?.position === 'top' ? "bg-primary text-white border-primary" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                                )}
                                            >
                                                Superior (Top)
                                            </button>
                                            <button
                                                onClick={() => updateConfig(c => ({ ...c, promo_banner: { ...(c.promo_banner || {}), position: 'bottom' } as any }))}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                                                    config.promo_banner?.position === 'bottom' ? "bg-primary text-white border-primary" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                                )}
                                            >
                                                Inferior (Bottom)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2 block">
                                            Enlace de Redirección (Opcional)
                                        </label>
                                        <input
                                            type="url"
                                            value={config.promo_banner?.target_url || ''}
                                            onChange={(e) => updateConfig(c => ({
                                                ...c,
                                                promo_banner: { ...(c.promo_banner || {}), target_url: e.target.value } as any
                                            }))}
                                            placeholder="https://wa.me/... o link externo"
                                            className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: Horarios & Pedidos (NUEVO) */}
                {activeTab === 'schedule' && (
                    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                        
                        {/* Bloqueo de Emergencia */}
                        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0" />
                                    <div>
                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Pausar Pedidos de Emergencia</h4>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">Deshabilita la recepción de pedidos en tiempo real inmediatamente.</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scheduleConfig.force_closed || false}
                                    onChange={(e) => updateConfig(c => ({
                                        ...c,
                                        schedule_config: {
                                            ...(c.schedule_config || DEFAULT_BUSINESS_SCHEDULE),
                                            force_closed: e.target.checked
                                        }
                                    }))}
                                    className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                />
                            </div>

                            {scheduleConfig.force_closed && (
                                <div className="mt-2 pt-2 border-t border-amber-500/20">
                                    <label className="text-xs font-bold text-amber-700 dark:text-amber-300 block mb-1">
                                        Mensaje Informativo cuando está Pausado
                                    </label>
                                    <input
                                        type="text"
                                        value={scheduleConfig.force_closed_message || ''}
                                        onChange={(e) => updateConfig(c => ({
                                            ...c,
                                            schedule_config: {
                                                ...(c.schedule_config || DEFAULT_BUSINESS_SCHEDULE),
                                                force_closed_message: e.target.value
                                            }
                                        }))}
                                        placeholder="Ej: Estamos experimentando alto volumen. Volvemos en breve."
                                        className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-amber-500/30 text-xs text-gray-900 dark:text-white outline-none focus:border-amber-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Horarios de Atención Semanales */}
                        <div className="space-y-4 pt-2">
                            <div>
                                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Horarios de Atención por Día</h4>
                                <p className="text-xs text-gray-500 mt-0.5">Configura aperturas y doble jornada (Turno 1 y Turno 2).</p>
                            </div>

                            {/* Selector de Días */}
                            <div className="flex overflow-x-auto gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl no-scrollbar">
                                {DAYS_LIST.map(d => {
                                    const dayObj = scheduleConfig.days?.[d.id]
                                    const isDayActive = dayObj?.enabled ?? true
                                    const isSelected = selectedDay === d.id

                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDay(d.id)}
                                            className={cn(
                                                "flex-1 min-w-[50px] py-2 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center gap-0.5",
                                                isSelected ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            <span>{d.short}</span>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", isDayActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-zinc-600")} />
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Card de Configuración del Día */}
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-700">
                                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                                        Horario para {DAYS_LIST.find(d => d.id === selectedDay)?.label}
                                    </span>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-zinc-300">
                                        <span>Atención este día</span>
                                        <input
                                            type="checkbox"
                                            checked={dayConfig.enabled}
                                            onChange={(e) => {
                                                const updatedDays = { ...scheduleConfig.days, [selectedDay]: { ...dayConfig, enabled: e.target.checked } }
                                                updateConfig(c => ({ ...c, schedule_config: { ...scheduleConfig, days: updatedDays } }))
                                            }}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                        />
                                    </label>
                                </div>

                                {dayConfig.enabled ? (
                                    <div className="space-y-3">
                                        {dayConfig.shifts.map((shift, shiftIdx) => (
                                            <div key={shiftIdx} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm">
                                                <span className="text-xs font-extrabold text-primary shrink-0 w-16">
                                                    Turno {shiftIdx + 1}:
                                                </span>

                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Apertura</label>
                                                        <input
                                                            type="time"
                                                            value={shift.open}
                                                            onChange={(e) => {
                                                                const newShifts = [...dayConfig.shifts]
                                                                newShifts[shiftIdx] = { ...shift, open: e.target.value }
                                                                const updatedDays = { ...scheduleConfig.days, [selectedDay]: { ...dayConfig, shifts: newShifts } }
                                                                updateConfig(c => ({ ...c, schedule_config: { ...scheduleConfig, days: updatedDays } }))
                                                            }}
                                                            className="w-full h-9 px-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Cierre</label>
                                                        <input
                                                            type="time"
                                                            value={shift.close}
                                                            onChange={(e) => {
                                                                const newShifts = [...dayConfig.shifts]
                                                                newShifts[shiftIdx] = { ...shift, close: e.target.value }
                                                                const updatedDays = { ...scheduleConfig.days, [selectedDay]: { ...dayConfig, shifts: newShifts } }
                                                                updateConfig(c => ({ ...c, schedule_config: { ...scheduleConfig, days: updatedDays } }))
                                                            }}
                                                            className="w-full h-9 px-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary"
                                                        />
                                                    </div>
                                                </div>

                                                {shiftIdx > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const newShifts = dayConfig.shifts.filter((_, idx) => idx !== shiftIdx)
                                                            const updatedDays = { ...scheduleConfig.days, [selectedDay]: { ...dayConfig, shifts: newShifts } }
                                                            updateConfig(c => ({ ...c, schedule_config: { ...scheduleConfig, days: updatedDays } }))
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                                                        title="Eliminar Turno"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {dayConfig.shifts.length < 2 && (
                                            <button
                                                onClick={() => {
                                                    const newShifts = [...dayConfig.shifts, { open: '18:00', close: '22:00' }]
                                                    const updatedDays = { ...scheduleConfig.days, [selectedDay]: { ...dayConfig, shifts: newShifts } }
                                                    updateConfig(c => ({ ...c, schedule_config: { ...scheduleConfig, days: updatedDays } }))
                                                }}
                                                className="w-full py-2 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>+ Agregar Doble Jornada (Segundo Turno)</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center text-xs text-gray-400">
                                        Este día se encuentra configurado como <strong>CERRADO</strong> (sin atención).
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* TAB 5: Redes Sociales & Contacto */}
                {activeTab === 'social' && (
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram URL
                                </label>
                                <input
                                    type="url"
                                    value={config.social_links?.instagram || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), instagram: e.target.value } as any }))}
                                    placeholder="https://instagram.com/mi_restaurante"
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook URL
                                </label>
                                <input
                                    type="url"
                                    value={config.social_links?.facebook || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), facebook: e.target.value } as any }))}
                                    placeholder="https://facebook.com/mi_restaurante"
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <Video className="w-3.5 h-3.5 text-black dark:text-white" /> TikTok URL
                                </label>
                                <input
                                    type="url"
                                    value={config.social_links?.tiktok || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), tiktok: e.target.value } as any }))}
                                    placeholder="https://tiktok.com/@mi_restaurante"
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Directo (Número)
                                </label>
                                <input
                                    type="text"
                                    value={config.social_links?.whatsapp || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), whatsapp: e.target.value } as any }))}
                                    placeholder="Ej: +573001234567"
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-indigo-500" /> Sitio Web Principal
                                </label>
                                <input
                                    type="url"
                                    value={config.social_links?.website || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), website: e.target.value } as any }))}
                                    placeholder="https://mirestaurante.com"
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> Google Maps Link
                                </label>
                                <input
                                    type="url"
                                    value={config.social_links?.google_maps || ''}
                                    onChange={(e) => updateConfig(c => ({ ...c, social_links: { ...(c.social_links || {}), google_maps: e.target.value } as any }))}
                                    placeholder="https://maps.google.com/?q=..."
                                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5 block">
                                Dirección Física (Se muestra en el Footer)
                            </label>
                            <input
                                type="text"
                                value={config.header_footer?.address_text || ''}
                                onChange={(e) => updateConfig(c => ({
                                    ...c,
                                    header_footer: { ...(c.header_footer || {}), address_text: e.target.value } as any
                                }))}
                                placeholder="Ej: Av. Principal #45-12, Bogotá, Colombia"
                                className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                )}

            </div>

            {/* RIGHT COLUMN: Interactive Smartphone Preview */}
            <div className="w-full xl:w-[420px] shrink-0 flex flex-col items-center">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">
                    <Smartphone className="w-4 h-4 text-primary" /> Previsualización en Tiempo Real
                </div>

                <PreviewPhone config={config} orgName={config.tenant_name || orgName} />
            </div>

        </div>
    )
}

/**
 * Componente interno para la previsualización interactiva responsive del smartphone
 */
function PreviewPhone({ config, orgName }: { config: PortalThemeConfig; orgName?: string }) {
    const { isGourmet, cardClasses, pageBackgroundClass } = usePortalTheme(config)
    const primaryColor = config.primary_color || '#4F46E5'
    const navStyle = config.category_nav_style || 'glass_cards'
    const [selectedCat, setSelectedCat] = useState("Todos")

    const categories = ["Todos", "Hamburguesas Gourmet", "Pizzas Artesanales", "Bebidas", "Postres"]

    return (
        <PortalThemeProvider config={config}>
            <div className="w-[360px] h-[720px] bg-zinc-950 rounded-[48px] p-3 shadow-2xl border-4 border-zinc-800 relative overflow-hidden flex flex-col">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-zinc-900 rounded-full z-30 flex items-center justify-end px-2">
                    <div className="w-2 h-2 rounded-full bg-blue-900" />
                </div>

                {/* Inner Screen Scroll Container */}
                <div className={cn("w-full h-full rounded-[38px] overflow-y-auto no-scrollbar flex flex-col pt-10 relative z-10", pageBackgroundClass)}>
                    {config.theme_id === 'cyber_glass_3d' && (
                        <CyberGlassBackground 
                            primaryColor={primaryColor} 
                            secondaryColor={config.secondary_color} 
                            isDark={isGourmet || config.color_mode === 'dark'} 
                        />
                    )}
                    
                    {/* Header */}
                    <PortalHeader 
                        config={{
                            ...config,
                            header_footer: {
                                ...(config.header_footer || {}),
                                show_header: true,
                                show_footer: true
                            }
                        }} 
                        orgName={config.tenant_name || orgName || "Mi Negocio"} 
                        isGourmet={isGourmet} 
                        isCompact={true}
                    />

                    {/* PROMO BANNER (TOP) */}
                    <PortalPromoBanner config={config} position="top" isGourmet={isGourmet} />

                    {/* Main Content Area */}
                    <div className="p-3 space-y-4 flex-1 pb-16">
                        
                        {/* Search Bar */}
                        <div className="relative">
                            <div className="w-full h-9 rounded-xl bg-gray-100/80 dark:bg-zinc-800/80 border border-gray-200/50 dark:border-zinc-700/50 flex items-center px-3 text-xs text-gray-400">
                                ¿Qué se te antoja hoy?
                            </div>
                        </div>

                        {/* Category Badges Preview */}
                        {navStyle === 'glass_cards' ? (
                            <div className="w-full flex items-center p-1 rounded-2xl bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_3px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.2)] overflow-hidden">
                                <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                                    {categories.map(cat => {
                                        const isSelected = selectedCat === cat
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCat(cat)}
                                                className={cn(
                                                    "relative flex items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-300 active:scale-95 whitespace-nowrap text-[10px] font-extrabold shrink-0",
                                                    isSelected 
                                                        ? "bg-white/95 dark:bg-zinc-800/95 shadow-sm text-gray-900 dark:text-white" 
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                )}
                                            >
                                                <span style={{ color: isSelected ? primaryColor : undefined }}>
                                                    {cat}
                                                </span>
                                                {isSelected && (
                                                    <div 
                                                        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full animate-pulse"
                                                        style={{ backgroundColor: primaryColor }}
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                {categories.map(cat => {
                                    const isSelected = selectedCat === cat
                                    let btnClass = ""
                                    if (navStyle === 'underline_tabs') {
                                        btnClass = cn(
                                            "py-1 px-2 text-[10px] font-bold whitespace-nowrap transition-all border-b-2 bg-transparent rounded-none",
                                            isSelected ? "border-primary text-primary" : "border-transparent text-gray-400"
                                        )
                                    } else {
                                        btnClass = cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all",
                                            isSelected ? "bg-primary text-white border-primary shadow-sm" : "bg-white dark:bg-zinc-900 text-gray-500 border-gray-200 dark:border-zinc-800"
                                        )
                                    }

                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCat(cat)}
                                            className={btnClass}
                                            style={isSelected ? { backgroundColor: navStyle !== 'underline_tabs' ? primaryColor : undefined } : undefined}
                                        >
                                            {cat}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Food Cards Grid */}
                        <div className="space-y-3 pt-1">
                            <div className="text-[11px] font-black uppercase tracking-wider opacity-60">Nuestros Platos</div>
                            
                            {PREVIEW_ITEMS.map(item => (
                                <div key={item.id} className={cn("p-3 flex gap-3 cursor-pointer", cardClasses)}>
                                    <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-bold text-xs line-clamp-1">{item.name}</h5>
                                        <p className="text-[10px] opacity-70 line-clamp-2 mt-0.5">{item.description}</p>
                                        <div className="mt-1.5 font-extrabold text-xs" style={{ color: primaryColor }}>
                                            ${item.base_price.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <PortalPromoBanner config={config} position="bottom" isGourmet={isGourmet} />

                    <PortalSocialFooter config={config} orgName={config.tenant_name || orgName || "Mi Negocio"} isGourmet={isGourmet} />

                    <FloatingGlassDock 
                        items={[
                            { id: 'menu', icon: Store, label: "Menú" },
                            { id: 'cart', icon: ShoppingBag, label: "Carrito" },
                            { id: 'orders', icon: ReceiptText, label: "Pedidos" },
                            { id: 'profile', icon: UserIcon, label: "Perfil" },
                        ]}
                        activeTab="menu" 
                        setActiveTab={() => {}} 
                        cartItemCount={2} 
                        primaryColor={primaryColor} 
                        isCompact={true}
                        dockStyle={config.dock_style || 'floating_glass'}
                    />
                </div>
            </div>
        </PortalThemeProvider>
    )
}
