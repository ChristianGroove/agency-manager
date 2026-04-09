-- Migration to seed all 5 styles for all template keys
-- Keys: quote_new, briefing_submission, portal_invite
-- Styles: minimal, corporate, bold, neo, swiss

DO $$
DECLARE
    template_keys text[] := ARRAY['quote_new', 'briefing_submission', 'portal_invite'];
    styles text[] := ARRAY['minimal', 'corporate', 'bold', 'neo', 'swiss'];
    t_key text;
    s_variant text;
    
    -- Setup subjects for each key
    subject_map jsonb := '{
        "quote_new": "Nueva Cotización: {{client_name}}",
        "briefing_submission": "Confirmación de Briefing: {{template_name}}",
        "portal_invite": "Bienvenido a tu Portal de Cliente"
    }';
    
    current_subject text;
BEGIN
    FOREACH t_key IN ARRAY template_keys LOOP
        -- Get subject from map
        current_subject := subject_map->>t_key;
        
        FOREACH s_variant IN ARRAY styles LOOP
            
            -- Insert if not exists (System Templates -> organization_id IS NULL)
            IF NOT EXISTS (
                SELECT 1 FROM email_templates 
                WHERE template_key = t_key 
                AND variant_name = s_variant 
                AND organization_id IS NULL
            ) THEN
                INSERT INTO email_templates (
                    template_key,
                    variant_name,
                    name,
                    subject_template,
                    body_html, -- Can be empty for hybrid logic
                    is_active,
                    organization_id
                ) VALUES (
                    t_key,
                    s_variant,
                    initcap(s_variant) || ' ' || initcap(replace(t_key, '_', ' ')),
                    current_subject,
                    '', -- Empty HTML, assuming code fallback
                    CASE WHEN s_variant = 'minimal' THEN true ELSE false END, -- Only minimal active by default
                    NULL -- System Template
                );
                
                RAISE NOTICE 'Inserted % - %', t_key, s_variant;
            ELSE
                RAISE NOTICE 'Skipped % - % (Exists)', t_key, s_variant;
            END IF;
            
        END LOOP;
    END LOOP;
END $$;
