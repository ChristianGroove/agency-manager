import { redirect } from "next/navigation"

export default function RolesRedirectPage() {
    redirect("/platform/settings?tab=roles")
}
