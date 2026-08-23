-- Migration: Add provisioned_by column to organizations
-- This separates the concept of "who created/provisioned this tenant" from "who owns this tenant"
-- provisioned_by tracks the user (SuperAdmin/Reseller) who created the organization
-- owner_id tracks the actual business owner of the organization

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS provisioned_by uuid REFERENCES auth.users(id);

-- Add index for lookups by provisioner
CREATE INDEX IF NOT EXISTS idx_organizations_provisioned_by
ON public.organizations(provisioned_by)
WHERE provisioned_by IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.organizations.provisioned_by IS 
'The user_id of the SuperAdmin or Reseller who originally created/provisioned this organization. Distinct from owner_id which tracks the actual business owner.';
