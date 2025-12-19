import { SettingsForm } from "@/components/modules/settings/settings-form"
import { getSettings } from "@/lib/actions/settings"

export const metadata = {
    title: "Configuración | Pixy Agency",
    description: "Administra la configuración de tu agencia",
}

export default async function SettingsPage() {
    const settings = await getSettings()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <SettingsForm initialSettings={settings} />
        </div>
    )
}
