import { getPortalInvoice, getPortalMetadata } from "@/modules/core/portal/actions"
import { notFound } from "next/navigation"
import { PortalInvoiceClientPage } from "./client-page"

interface PageProps {
    params: {
        token: string
        id: string
    }
}

export default async function PortalInvoicePrintPage({ params }: PageProps) {
    const { token, id } = await params
    let invoice
    let settings

    try {
        invoice = await getPortalInvoice(token, id)
        settings = await getPortalMetadata(token)
    } catch (error) {
        console.error(error)
        notFound()
    }

    if (!invoice) return notFound()

    return <PortalInvoiceClientPage invoice={invoice} settings={settings} />
}
