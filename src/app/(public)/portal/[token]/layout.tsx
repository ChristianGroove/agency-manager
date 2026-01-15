
import { Metadata } from "next"
import { getPortalMetadata } from "@/modules/core/portal/actions"

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
        const title = settings.portal_og_title || `${brandName} - Portal de Clientes`
        const description = settings.portal_og_description || "Accede a tus facturas, cotizaciones y servicios de forma segura."
        const favicon = settings.portal_favicon_url || settings.isotipo_url || "/pixy-isotipo.png"

        // Use custom image if set, otherwise use dynamic generator
        const ogImage = settings.portal_og_image_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.pixy.com.co'}/api/og/portal?token=${token}`

        return {
            title: title,
            description: description,
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

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
