
"use client"

import GlassCard3D from "@/components/ui/glass-card-3d"

// Wrapper to standardise props if needed, or we can use GlassCard3D directly in the registry.
// For consistency, let's export it here.

export interface SocialGlassWidgetProps {
    title?: string
    facebook?: string
    instagram?: string
    twitter?: string
}

export function SocialGlassWidget({ title, facebook, instagram, twitter }: SocialGlassWidgetProps) {
    return (
        <GlassCard3D
            title={title}
            socialFacebook={facebook}
            socialInstagram={instagram}
            socialTwitter={twitter}
        />
    )
}
