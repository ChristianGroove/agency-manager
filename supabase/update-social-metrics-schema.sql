-- Add JSONB columns for facebook and instagram data
ALTER TABLE meta_social_metrics 
ADD COLUMN IF NOT EXISTS facebook_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS instagram_data JSONB DEFAULT '{}'::jsonb;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';

-- Optional: We can keep the old columns as aggregates or legacy, but we should probably null them out or ignore them.
-- For now, we will add new columns to avoid breaking changes if any other system reads them.
-- But the Portal reads them. We updated the Portal to read JSON. Wait, no.
-- The Portal "AdsDashboard" and "SocialDashboard" are React components receiving data.
-- The API route (/api/portal/insights) fetches from this table.
-- We should verify if the API route selects specific columns or *.
