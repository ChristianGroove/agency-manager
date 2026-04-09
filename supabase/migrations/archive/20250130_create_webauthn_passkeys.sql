-- WebAuthn/Passkeys System Migration
-- Creates tables for storing user passkeys and authentication challenges

-- ============================================================================
-- 1. USER PASSKEYS TABLE
-- Stores WebAuthn credentials for each user
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WebAuthn credential data
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    
    -- Device metadata (for user-friendly display)
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('platform', 'cross-platform')),
    
    -- Transports (usb, nfc, ble, internal)
    transports TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_user_credential UNIQUE (user_id, credential_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_credential_id ON public.user_passkeys(credential_id);

-- ============================================================================
-- 2. PASSKEY CHALLENGES TABLE
-- Temporary storage for registration/authentication challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT, -- For registration flow when user doesn't exist yet
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_challenge ON public.passkey_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON public.passkey_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_id ON public.passkey_challenges(user_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user_passkeys
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own passkeys
DROP POLICY IF EXISTS "Users can view their own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can view their own passkeys"
    ON public.user_passkeys 
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own passkeys
DROP POLICY IF EXISTS "Users can insert their own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can insert their own passkeys"
    ON public.user_passkeys 
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own passkeys (for counter, last_used_at, device_name)
DROP POLICY IF EXISTS "Users can update their own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can update their own passkeys"
    ON public.user_passkeys 
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own passkeys
DROP POLICY IF EXISTS "Users can delete their own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can delete their own passkeys"
    ON public.user_passkeys 
    FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS on passkey_challenges
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything with challenges (for API routes)
DROP POLICY IF EXISTS "Service role full access to challenges" ON public.passkey_challenges;
CREATE POLICY "Service role full access to challenges"
    ON public.passkey_challenges 
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 4. CLEANUP FUNCTION
-- Automatically delete expired challenges
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_passkey_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.passkey_challenges
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-passkey-challenges', '*/5 * * * *', 'SELECT cleanup_expired_passkey_challenges()');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Uncomment to verify the migration:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%passkey%';
-- SELECT * FROM pg_policies WHERE tablename IN ('user_passkeys', 'passkey_challenges');
