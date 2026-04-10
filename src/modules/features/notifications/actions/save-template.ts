
"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"

export async function saveEmailTemplate(
    templateId: string,
    htmlContent: string,
    blocks: any[],
    subject?: string
) {
    const supabase = await createClient()

    try {
        const updateData: any = {
            body_html: htmlContent,
            content_blocks: blocks,
            updated_at: new Date().toISOString()
        }

        if (subject) {
            updateData.subject_template = subject
        }

        let error;

        // Basic check for UUID format or specific "new" flag
        const isNew = templateId === 'new_template_id' || !templateId.includes('-');

        if (isNew) {
            // INSERT
            // We need mandatory fields for insert: name, template_key
            const insertPayload = {
                ...updateData,
                name: 'Custom Template ' + new Date().toLocaleDateString(),
                template_key: 'custom_builder_' + Date.now(),
                variant_name: 'custom',
                subject_template: subject || 'Available for design',
                is_active: true
            };

            const { data, error: insertError } = await supabase
                .from('email_templates')
                .insert(insertPayload)
                .select()
                .single();

            error = insertError;
            if (data) return { success: true, newId: data.id };
        } else {
            // UPDATE
            const { error: updateError } = await supabase
                .from('email_templates')
                .update(updateData)
                .eq('id', templateId);
            error = updateError;
        }

        if (error) throw error

        revalidatePath('/platform/settings/notifications')
        return { success: true }
    } catch (error) {
        console.error('Error saving template:', error)
        return { success: false, error: 'Failed to save template' }
    }
}
