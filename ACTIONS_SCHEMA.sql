-- ACTIONS SCHEMA (Phase 1)
-- Updates to support Ad-hoc Actions from Assistant

-- 1. Briefings Table Updates
-- Allow creating briefs without a pre-defined template, and give them a Title/Description.
ALTER TABLE public.briefings
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ALTER COLUMN template_id DROP NOT NULL;

-- 2. Index for efficiency (optional)
CREATE INDEX IF NOT EXISTS idx_briefings_client_created ON public.briefings (client_id, created_at DESC);

-- 3. Idempotency Support?
-- The user requested idempotency using intent_log_id.
-- We can store this in `metadata` JSONB column if it exists, or look up via logs.
-- The instruction says: "If intent already executed... Return reference".
-- We should probably store `intent_log_id` in the created record for reverse lookup?
-- Or just rely on the `assistant_intent_logs` which stores `result_reference_id`.
-- Rebound check: `assistant_intent_logs` is the source of truth. We don't necessarily need valid linkage on the brief side, but it's nice.
-- Let's stick to the Log as the source of truth for Idempotency as per plan.

-- Refresh Schema Cache
NOTIFY pgrst, 'reload config';
