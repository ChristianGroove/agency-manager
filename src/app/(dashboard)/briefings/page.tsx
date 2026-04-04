
import { getFormSubmissions } from "@/modules/features/forms/actions"
import { FormPageHeader } from "@/modules/features/forms/form-page-header"
import { DynamicFormList } from "@/modules/features/forms/dynamic-form-list"

export default async function BriefingsPage() {
    const submissions = await getFormSubmissions()

    return (
        <div className="space-y-8">
            <FormPageHeader />

            <DynamicFormList submissions={submissions || []} />
        </div>
    )
}




