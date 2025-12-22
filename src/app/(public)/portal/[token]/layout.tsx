
import { Metadata } from "next"
import { getPortalMetadata } from "@/app/actions/portal-actions"

type Props = {
    params: Promise<{ token: string }>
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const resolvedParams = await params
    const token = resolvedParams.token
    const settings = await getPortalMetadata(token)

    const title = settings.portal_og_title || settings.agency_name || "Pixy Portal"
    const description = settings.portal_og_description || settings.portal_welcome_message || "Portal de clientes"
    const image = settings.portal_og_image_url || settings.portal_logo_url || settings.main_logo_url

    return {
        title: title,
        description: description,
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
