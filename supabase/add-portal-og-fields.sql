alter table organization_settings
add column if not exists portal_og_title text,
add column if not exists portal_og_description text,
add column if not exists portal_og_image_url text;
