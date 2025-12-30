
import { Metadata } from "next"
import { getPortalMetadata } from "@/modules/core/portal/actions"

type Props = {
    params: Promise<{ token: string }>
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const resolvedParams = await params
    const token = resolvedParams.token
    const settings = await getPortalMetadata(token)

    const title = settings.portal_og_title || settings.agency_name || "Portal de Cliente"
    const description = settings.portal_og_description || "Acceso seguro a su cuenta"
    const image = settings.portal_og_image_url || settings.portal_logo_url || "/pixy-isotipo.png"
    const favicon = settings.portal_favicon_url || settings.isotipo_url || "/pixy-isotipo.png"

    return {
        title: title,
        description: description,
        icons: {
            icon: favicon,
            shortcut: favicon,
            apple: favicon,
        },
        openGraph: {
            title: title,
            description: description,
            images: image ? [image] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: image ? [image] : [],
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
