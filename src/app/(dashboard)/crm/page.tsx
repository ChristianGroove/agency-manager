import { redirect } from "next/navigation"

export default function CRMHubPage() {
    // Redirect to Contacts as the default view
    redirect("/crm/contacts")
}
