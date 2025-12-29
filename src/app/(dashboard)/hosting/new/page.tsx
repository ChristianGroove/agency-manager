import { HostingForm } from "@/modules/verticals/agency/hosting/hosting-form"

export default function NewHostingPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Nuevo Hosting</h2>
            </div>
            <HostingForm />
        </div>
    )
}
