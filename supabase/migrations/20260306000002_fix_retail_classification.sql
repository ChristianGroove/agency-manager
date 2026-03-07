-- ==============================================================================
-- FINAL RETAIL SPACE CLASSIFICATION
-- Ensures the Retail app has the correct 'retail' space_category for the dashboard.
-- ==============================================================================

UPDATE public.saas_apps 
SET space_category = 'retail' 
WHERE id = 'app_retail';

-- Also ensure any organization named 'Retail Demo' is correctly flagged if the app isn't explicitly set
-- (Though our code now handles this via name fallback, this makes it persistent)
UPDATE public.organizations
SET organization_type = 'client'
WHERE name ILIKE '%Retail%';
