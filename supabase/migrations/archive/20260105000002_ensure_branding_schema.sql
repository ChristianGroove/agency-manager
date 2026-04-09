-- MIGRATION: Ensure Branding Schema & Agency Whitelabel

-- 1. Ensure organization_settings table exists
CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Branding Fields
    agency_name TEXT,
    agency_website TEXT,
    
    -- Assets
    main_logo_url TEXT,
    portal_logo_url TEXT, -- Square/Icon
    isotipo_url TEXT,     -- Favicon
    
    -- Colors & Theme
    portal_primary_color TEXT DEFAULT '#4F46E5',
    portal_secondary_color TEXT DEFAULT '#EC4899',
    portal_login_background_url TEXT,
    portal_login_background_color TEXT DEFAULT '#F3F4F6',
    brand_font_family TEXT DEFAULT 'Inter',
    
    -- Socials
    social_facebook TEXT,
    social_instagram TEXT,
    social_twitter TEXT,
    social_linkedin TEXT
);

-- 2. Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (If not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'Members can view their own settings'
    ) THEN
        CREATE POLICY "Members can view their own settings" ON public.organization_settings
            FOR SELECT
            USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'Owners/Admins can update settings'
    ) THEN
        CREATE POLICY "Owners/Admins can update settings" ON public.organization_settings
            FOR UPDATE
            USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members 
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
                )
            );
    END IF;

    -- Allow insert if member (often needed for first setup)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'Members can insert settings'
    ) THEN
        CREATE POLICY "Members can insert settings" ON public.organization_settings
            FOR INSERT
            WITH CHECK (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 4. Enable White Label Module for Agency Vertical
-- This ensures 'getEffectiveBranding' respects the tenant's choices
INSERT INTO public.vertical_modules (vertical_key, module_key, is_core, is_default_enabled)
VALUES ('agency', 'module_whitelabel', TRUE, TRUE)
ON CONFLICT (vertical_key, module_key) DO UPDATE
SET is_core = TRUE, is_default_enabled = TRUE;

-- 5. Create Storage Bucket for Branding (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public Read
CREATE POLICY "Public Access Branding" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

-- Storage Policy: Auth Upload
CREATE POLICY "Auth Upload Branding" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- Storage Policy: Owners Update/Delete (Simplified to Auth for MVP, refine later)
CREATE POLICY "Auth Update Branding" ON storage.objects
  FOR UPDATE USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

