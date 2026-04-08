
"use client"

import GlassCard3D from "@/components/ui/glass-card-3d"

// Wrapper to standardise props if needed, or we can use GlassCard3D directly in the registry.
// For consistency, let's export it here.

export interface SocialGlassWidgetProps {
    title?: string
    companyName?: string
    facebook?: string
    instagram?: string
    whatsapp?: string
}

export function SocialGlassWidget({ title, companyName, facebook, instagram, whatsapp }: SocialGlassWidgetProps) {
    return (
        <GlassCard3D
            title={title}
            companyName={companyName}
            socialFacebook={facebook}
            socialInstagram={instagram}
            socialWhatsapp={whatsapp}
        />
    )
}
