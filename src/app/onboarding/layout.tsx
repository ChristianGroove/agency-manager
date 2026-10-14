import { ParticlesBackground } from "@/components/ui/particles-background"
import { AuthThemeToggle } from "@/components/ui/auth-theme-toggle"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between">
            {/* Dynamic Background with reactive particles */}
            <div className="absolute inset-0 z-0">
                <ParticlesBackground />
            </div>

            <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-4">
                <main className="w-full flex-1 flex flex-col items-center justify-center">
                    {children}
                </main>
            </div>

            {/* Footer with branding and theme toggle */}
            <div className="relative z-10 flex flex-col items-center gap-2 pb-6 select-none">
                <p className="text-xs text-zinc-600 dark:text-white font-medium text-center">
                    <span className="animate-text-shimmer-slow">Powered by Pixy</span>
                </p>
                <AuthThemeToggle />
            </div>
        </div>
    )
}
