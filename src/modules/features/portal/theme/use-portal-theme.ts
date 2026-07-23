import { useMemo } from 'react'
import { PortalThemeConfig, DEFAULT_PORTAL_THEME_CONFIG } from './types'
import { cn } from '@/modules/infrastructure/utils/utils'

export function usePortalTheme(rawConfig?: Partial<PortalThemeConfig> | null) {
    const config: PortalThemeConfig = useMemo(() => {
        if (!rawConfig) return DEFAULT_PORTAL_THEME_CONFIG
        return {
            theme_id: rawConfig.theme_id || DEFAULT_PORTAL_THEME_CONFIG.theme_id,
            color_mode: rawConfig.color_mode || DEFAULT_PORTAL_THEME_CONFIG.color_mode,
            background_style: rawConfig.background_style || DEFAULT_PORTAL_THEME_CONFIG.background_style,
            logo_variant: rawConfig.logo_variant || DEFAULT_PORTAL_THEME_CONFIG.logo_variant,
            tenant_logos: rawConfig.tenant_logos || DEFAULT_PORTAL_THEME_CONFIG.tenant_logos,
            category_nav_style: rawConfig.category_nav_style || DEFAULT_PORTAL_THEME_CONFIG.category_nav_style,
            animations_enabled: rawConfig.animations_enabled ?? DEFAULT_PORTAL_THEME_CONFIG.animations_enabled,
            card_style: {
                ...DEFAULT_PORTAL_THEME_CONFIG.card_style,
                ...(rawConfig.card_style || {})
            },
            promo_banner: {
                ...DEFAULT_PORTAL_THEME_CONFIG.promo_banner,
                ...(rawConfig.promo_banner || {}),
                enabled: rawConfig.promo_banner?.enabled ?? DEFAULT_PORTAL_THEME_CONFIG.promo_banner?.enabled ?? false,
                position: rawConfig.promo_banner?.position || DEFAULT_PORTAL_THEME_CONFIG.promo_banner?.position || 'top',
            },
            social_links: {
                ...DEFAULT_PORTAL_THEME_CONFIG.social_links,
                ...(rawConfig.social_links || {})
            },
            header_footer: {
                ...DEFAULT_PORTAL_THEME_CONFIG.header_footer,
                ...(rawConfig.header_footer || {}),
                show_header: rawConfig.header_footer?.show_header ?? DEFAULT_PORTAL_THEME_CONFIG.header_footer?.show_header ?? true,
                show_footer: rawConfig.header_footer?.show_footer ?? DEFAULT_PORTAL_THEME_CONFIG.header_footer?.show_footer ?? true,
            }
        }
    }, [rawConfig])

    const isGlass = config.theme_id === 'modern_glass'
    const isGourmet = config.theme_id === 'gourmet_elegance'

    // Compute Card Styling with high-contrast text rules
    const cardClasses = useMemo(() => {
        const classes: string[] = ['transition-all duration-300 relative overflow-hidden']

        // Radius
        if (config.card_style.border_radius === 'full') classes.push('rounded-3xl')
        else if (config.card_style.border_radius === '3xl') classes.push('rounded-2xl')
        else classes.push('rounded-xl')

        // Variant & Theme
        if (isGlass) {
            if (config.card_style.variant === 'glass') {
                classes.push('bg-white/80 dark:bg-zinc-900/90 text-gray-900 dark:text-white backdrop-blur-xl border border-gray-200/70 dark:border-zinc-700/60 shadow-xl')
            } else if (config.card_style.variant === 'bordered') {
                classes.push('bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-2 border-primary/40 shadow-md')
            } else if (config.card_style.variant === 'elevated') {
                classes.push('bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-zinc-800')
            } else {
                classes.push('bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-200/80 dark:border-zinc-800')
            }
        } else if (isGourmet) {
            // Gourmet Elegance Style
            if (config.card_style.variant === 'glass') {
                classes.push('bg-zinc-900/90 text-amber-50 backdrop-blur-xl border border-amber-500/30 shadow-2xl')
            } else if (config.card_style.variant === 'bordered') {
                classes.push('bg-zinc-950 text-amber-50 border-2 border-amber-500/40 shadow-lg')
            } else if (config.card_style.variant === 'elevated') {
                classes.push('bg-zinc-900 text-amber-50 border border-amber-500/20 shadow-2xl')
            } else {
                classes.push('bg-zinc-900 text-amber-50 border border-zinc-800')
            }
        }

        // Hover Effects
        if (config.card_style.hover_effect === 'zoom') {
            classes.push('hover:-translate-y-1 hover:shadow-2xl')
        } else if (config.card_style.hover_effect === 'glow') {
            classes.push('hover:border-primary hover:shadow-lg')
        } else if (config.card_style.hover_effect === 'lift') {
            classes.push('hover:-translate-y-2 hover:scale-[1.01]')
        }

        return classes.join(' ')
    }, [config.card_style, isGlass, isGourmet])

    // Container / Page Background
    const pageBackgroundClass = useMemo(() => {
        if (isGourmet) {
            return 'bg-zinc-950 text-amber-50 min-h-screen'
        }
        if (config.background_style === 'gradient') {
            return 'bg-gradient-to-br from-gray-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-gray-900 dark:text-white min-h-screen'
        }
        if (config.background_style === 'mesh') {
            return 'bg-slate-50 dark:bg-zinc-950 text-gray-900 dark:text-white min-h-screen'
        }
        return 'bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white min-h-screen'
    }, [config.background_style, isGourmet])

    return {
        config,
        isGlass,
        isGourmet,
        cardClasses,
        pageBackgroundClass,
    }
}
