-- Create Meta Insights module and enable it for portal

-- 1. Insert the module if it doesn't exist
INSERT INTO public.system_modules (key, name, description, category, is_active, has_client_portal_view, portal_tab_label, portal_icon_key)
VALUES (
    'meta_insights',
    'Meta Insights',
    'Facebook & Instagram advertising analytics and insights',
    'analytics',
    true,
    true,
    'Insights',
    'BarChart3'
)
ON CONFLICT (key) DO UPDATE SET
    has_client_portal_view = true,
    portal_tab_label = 'Insights',
    portal_icon_key = 'BarChart3';

-- 2. Verify the module was created
SELECT key, name, has_client_portal_view, portal_tab_label, portal_icon_key
FROM public.system_modules
WHERE key = 'meta_insights';
