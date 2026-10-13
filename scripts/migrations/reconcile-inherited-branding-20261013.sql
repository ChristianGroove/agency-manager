-- Operational repair, not an automatic schema migration.
-- Production project: Pixy control (amwlwmkejdjskukdfwut).
-- Only Karla Tanco and Retail Demo, and only exact copies of the three deleted Pixy assets.
-- NULL restores live inheritance. Custom logos and the existing portal logo are preserved.
-- Execute the whole file only after approval.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $guard$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.platform_settings WHERE id = 1
        AND NULLIF(main_logo_url, '') IS NOT NULL
        AND NULLIF(main_logo_light_url, '') IS NOT NULL
        AND NULLIF(favicon_url, '') IS NOT NULL
        AND main_logo_url <> 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815057247_rgx43z2xg.png'
        AND main_logo_light_url <> 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815064697_1yqivrsbn.png'
        AND favicon_url <> 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1767709889548_3ngmixl7c.svg'
    ) THEN
        RAISE EXCEPTION 'Global branding must be repaired before restoring tenant inheritance';
    END IF;
END;
$guard$;

UPDATE public.organization_settings s
SET main_logo_url = CASE WHEN s.main_logo_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815057247_rgx43z2xg.png' THEN NULL ELSE s.main_logo_url END,
    main_logo_light_url = CASE WHEN s.main_logo_light_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815064697_1yqivrsbn.png' THEN NULL ELSE s.main_logo_light_url END,
    isotipo_url = CASE WHEN s.isotipo_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1767709889548_3ngmixl7c.svg' THEN NULL ELSE s.isotipo_url END,
    updated_at = now()
FROM public.organizations o
WHERE o.id = s.organization_id
AND ((o.id = '83e85d20-09b5-46db-b709-4248444213c6' AND o.slug = 'karla-tanco')
  OR (o.id = 'f0547001-6027-408b-8a89-ee73be73d3fa' AND o.slug = 'retail-demo'))
AND (s.main_logo_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815057247_rgx43z2xg.png'
  OR s.main_logo_light_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815064697_1yqivrsbn.png'
  OR s.isotipo_url = 'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1767709889548_3ngmixl7c.svg')
RETURNING o.slug, s.main_logo_url, s.main_logo_light_url, s.isotipo_url;

COMMIT;

SELECT o.slug, s.main_logo_url, s.main_logo_light_url, s.isotipo_url, s.portal_logo_url
FROM public.organization_settings s JOIN public.organizations o ON o.id = s.organization_id
WHERE o.id IN ('83e85d20-09b5-46db-b709-4248444213c6', 'f0547001-6027-408b-8a89-ee73be73d3fa')
ORDER BY o.slug;
