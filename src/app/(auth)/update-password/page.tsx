import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { UpdatePasswordForm } from "./update-password-form"

export default async function UpdatePasswordPage() {
    // Verify session server-side
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        // If no session, the magic link might be invalid or expired.
        // Or the callback failed.
        redirect("/login?error=recovery_session_missing")
    }

    return <UpdatePasswordForm />
}
