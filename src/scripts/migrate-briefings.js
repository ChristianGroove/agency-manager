const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateData() {
    console.log('Starting legacy briefing migration...');

    // 1. Fetch all templates with their relational steps and fields
    // We use the same query as `getBriefingTemplates` currently does
    const { data: templates, error } = await supabase
        .from('briefing_templates')
        .select(`
            *,
            steps:briefing_steps(
                id, title, description, order_index,
                fields:briefing_fields(
                    id, label, type, required, options, order_index
                )
            )
        `);

    if (error) {
        console.error('Error fetching templates:', error);
        return;
    }

    console.log(`Found ${templates.length} templates to migrate.`);

    for (const tmpl of templates) {
        // 2. Transform to "Form Builder" JSON structure
        // Flattening logic as per user request: Array of fields.
        // BUT, we want to maybe preserve Step info if possible?
        // User schema: Array<{ id, type, label, required, options, ... }>

        let flattenedFields = [];

        // Sort steps
        const steps = tmpl.steps || [];
        steps.sort((a, b) => a.order_index - b.order_index);

        for (const step of steps) {
            const fields = step.fields || [];
            fields.sort((a, b) => a.order_index - b.order_index);

            // Map fields
            const mappedFields = fields.map(f => ({
                id: f.id,
                type: f.type,
                label: f.label,
                required: f.required,
                options: f.options, // Assuming it's already array of strings or null
                // We add extra metadata to preserve context if needed, but keeping it clean
                step_title: step.title // Optional: keep track of original step
            }));

            flattenedFields = [...flattenedFields, ...mappedFields];
        }

        // 3. Update the template
        console.log(`Migrating template: ${tmpl.name} with ${flattenedFields.length} fields...`);

        const { error: updateError } = await supabase
            .from('briefing_templates')
            .update({
                structure: flattenedFields,
                // We don't delete steps/fields yet to be safe
            })
            .eq('id', tmpl.id);

        if (updateError) {
            console.error(`Failed to update template ${tmpl.name}:`, updateError);
        } else {
            console.log(`Successfully updated ${tmpl.name}`);
        }
    }

    console.log('Migration complete.');
}

migrateData();
