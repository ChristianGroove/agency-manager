-- Required before pending 20261011 onboarding/help migrations. The production
-- history records older migrations, but its schema is missing these columns.
-- Add only the canonical prerequisites; never overwrite existing state or roles.
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.platform_access_invitations
  ADD COLUMN IF NOT EXISTS target_organization_type varchar(50) DEFAULT 'client';
NOTIFY pgrst, 'reload schema';
