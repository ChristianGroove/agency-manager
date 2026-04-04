
import { Metadata } from "next"
import { getPortalMetadata } from "@/modules/features/portal/services/portal-service"

type Props = {
    params: Promise<{ token: string }>
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    try {
        const resolvedParams = await params
        const token = resolvedParams.token
        const settings = await getPortalMetadata(token)

        const brandName = settings.agency_name || "Pixy"
        const isAttendance = (settings as any).isAttendance === true

        let title = settings.portal_og_title || `${brandName} - Portal de Clientes`
        if (isAttendance) {
            title = "Control"
        }

        const description = settings.portal_og_description || "Accede a tus facturas, cotizaciones y servicios de forma segura."
        const favicon = settings.portal_favicon_url || settings.isotipo_url || "/pixy-isotipo.png"

        // Use custom image if set, otherwise use dynamic generator
        const ogImage = settings.portal_og_image_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.pixy.com.co'}/api/og/portal?token=${token}`

        return {
            title: title,
            description: description,
            appleWebApp: {
                title: title,
                statusBarStyle: "default",
                capable: true,
            },
            icons: {
                icon: favicon + "?v=2",
                shortcut: favicon + "?v=2",
                apple: favicon + "?v=2",
            },
            openGraph: {
                title: title,
                description: description,
                images: [{ url: ogImage, width: 1200, height: 630 }],
                type: 'website',
                siteName: brandName,
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [ogImage],
            }
        }
    } catch (e) {
        console.error("Metadata generation error:", e)
        return {
            title: "Portal de Clientes",
            description: "Accede a tus facturas, cotizaciones y servicios de forma segura."
        }
    }
}

import { BrandingProvider } from "@/components/providers/branding-provider"
import { BrandingConfig } from "@/types/branding"

export default async function PortalLayout({
    children,
    params
}: {
    children: React.ReactNode
    params: Promise<{ token: string }>
}) {
    const resolvedParams = await params
    const token = resolvedParams.token
    const settings = await getPortalMetadata(token)

    const brandingConfig: BrandingConfig = {
        name: settings.agency_name || "Portal",
        logos: {
            main: settings.main_logo_url || null,
            main_light: settings.main_logo_light_url || null,
            portal: settings.portal_logo_url || null,
            favicon: settings.portal_favicon_url || settings.isotipo_url || "/pixy-isotipo.png",
            login_bg: settings.portal_login_background_url || null
        },
        colors: {
            primary: settings.portal_primary_color || "#F205E2",
            secondary: settings.portal_secondary_color || "#00E0FF"
        },
        font_family: settings.brand_font_family || "Inter",
        socials: {}
    }

    return (
        <BrandingProvider initialBranding={brandingConfig}>
            {children}
        </BrandingProvider>
    )
}
