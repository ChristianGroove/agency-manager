import Image from "next/image"

export default function BriefingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b h-16 flex items-center justify-center px-6 sticky top-0 z-10">
                <div className="relative w-40 h-10">
                    <Image
                        src="/branding/logo dark.svg"
                        alt="Agency Manager"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </header>
            <main className="flex-1 w-full max-w-3xl mx-auto p-6 md:p-10">
                {children}
            </main>
            <footer className="py-6 text-center text-sm text-gray-400">
                &copy; {new Date().getFullYear()} Agency Manager. Todos los derechos reservados.
            </footer>
        </div>
    )
}
