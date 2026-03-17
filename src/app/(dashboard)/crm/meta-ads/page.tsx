import { MetaAdsCenter } from "@/modules/core/marketing/components/meta-ads-center"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Meta Ads Monitor | Pixy",
    description: "Monitorea el rendimiento de tus anuncios de Meta y leads en tiempo real."
}

export default function MetaAdsPage() {
    return <MetaAdsCenter />
}
