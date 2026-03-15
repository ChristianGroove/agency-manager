import { ViewContextProvider } from "@/modules/core/caa/context/view-context"

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ViewContextProvider>
            <div className="min-h-screen bg-gray-50">
                {children}
            </div>
        </ViewContextProvider>
    )
}
