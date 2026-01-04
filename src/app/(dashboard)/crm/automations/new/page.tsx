import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"

export default async function NewAutomationPage() {
    // Generate a new UUID server-side to avoid hydration mismatch
    const supabase = await createClient()
    const newId = crypto.randomUUID()

    // Redirect to the editor with the new ID
    redirect(`/crm/automations/${newId}`)
}
