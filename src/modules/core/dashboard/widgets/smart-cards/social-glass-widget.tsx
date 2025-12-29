
"use client"

import GlassCard3D from "@/components/ui/glass-card-3d"

// Wrapper to standardise props if needed, or we can use GlassCard3D directly in the registry.
// For consistency, let's export it here.

export interface SocialGlassWidgetProps {
    facebook?: string
    instagram?: string
    twitter?: string
    fbFollowers?: number
    igFollowers?: number
}

export function SocialGlassWidget({ facebook, instagram, twitter, fbFollowers, igFollowers }: SocialGlassWidgetProps) {
    return (
        <GlassCard3D
            socialFacebook={facebook}
            socialInstagram={instagram}
            socialTwitter={twitter}
            facebookFollowers={fbFollowers || 0}
            instagramFollowers={igFollowers || 0}
        />
    )
}
