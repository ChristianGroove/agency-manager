-- Add Portal Settings columns to organization_settings table

alter table public.organization_settings 
add column if not exists portal_enabled boolean default true,
add column if not exists portal_subdomain text,
add column if not exists portal_welcome_message text,
add column if not exists portal_footer_text text,
add column if not exists portal_logo_url text,
add column if not exists portal_primary_color text,
add column if not exists portal_secondary_color text,
add column if not exists portal_show_agency_name boolean default true,
add column if not exists portal_show_contact_info boolean default true,
add column if not exists portal_modules jsonb default '{"invoices": true, "payments": true, "briefings": true}'::jsonb;
