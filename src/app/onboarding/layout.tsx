import { BrandingHeader } from "@/components/onboarding/branding-header"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
            <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
            <div className="flex-1 flex flex-col">
                <main className="flex-1 flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    )
}
