-- Add branding columns to organization_settings
alter table organization_settings
add column if not exists invoice_logo_url text,
add column if not exists main_logo_url text,
add column if not exists isotipo_url text;

-- Pre-load values using the existing agency logo as a starting point (or placeholders if empty)
-- This ensures the fields aren't empty when the user visits the settings page
update organization_settings
set
  invoice_logo_url = coalesce(invoice_logo_url, agency_logo_url),
  main_logo_url = coalesce(main_logo_url, agency_logo_url),
  isotipo_url = coalesce(isotipo_url, agency_logo_url);
