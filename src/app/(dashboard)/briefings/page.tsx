
import { getFormSubmissions } from "@/modules/core/forms/actions"
import { FormPageHeader } from "@/modules/core/forms/form-page-header"
import { DynamicFormList } from "@/modules/core/forms/dynamic-form-list"

export default async function BriefingsPage() {
    const submissions = await getFormSubmissions()

    return (
        <div className="space-y-8">
            <FormPageHeader />

            <DynamicFormList submissions={submissions || []} />
        </div>
    )
}



