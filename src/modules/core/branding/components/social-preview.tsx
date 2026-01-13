"use client"

import { BrandingConfig } from "@/types/branding"
import { Card } from "@/components/ui/card"

interface SocialPreviewProps {
    settings: BrandingConfig
}

export function SocialPreview({ settings }: SocialPreviewProps) {
    const title = settings.name || "Agency Name"
    const description = "Access your client portal to view invoices, services, and more."
    const image = settings.logos.login_bg || settings.logos.main || "/branding/logo dark.svg"
    const domain = settings.custom_domain || "portal.pixy.com"

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500">Social Share Preview</h4>
            <div className="max-w-sm bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {/* Mock WA/Slack Link Preview */}
                <div className="h-40 bg-gray-300 relative overflow-hidden">
                    {image && (
                        <img src={image} alt="OG Image" className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="p-3 bg-gray-50">
                    <div className="font-bold text-gray-900 truncate">{title} | Client Portal</div>
                    <div className="text-xs text-gray-600 line-clamp-2 mt-1">{description}</div>
                    <div className="text-[10px] text-gray-400 mt-2 uppercase">{domain}</div>
                </div>
            </div>
            <p className="text-[10px] text-gray-400">
                How your portal link looks when shared on WhatsApp, Sling, or Facebook.
            </p>
        </div>
    )
}
