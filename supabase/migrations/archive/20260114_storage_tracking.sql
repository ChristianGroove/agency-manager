-- ============================================
-- STORAGE TRACKING PER TENANT
-- ============================================
-- Tracks storage usage per organization
-- Validates limits before upload
-- ============================================

-- 1. Storage usage table (cache for quick lookups)
CREATE TABLE IF NOT EXISTS public.storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    total_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Function: Calculate storage for an org (on-demand recalculation)
CREATE OR REPLACE FUNCTION public.calculate_org_storage(p_organization_id UUID)
RETURNS TABLE(total_bytes BIGINT, file_count INTEGER) AS $$
DECLARE
    v_total_bytes BIGINT;
    v_file_count INTEGER;
    v_bucket_prefix TEXT;
BEGIN
    -- Files are typically stored with org prefix: org_{uuid}/...
    v_bucket_prefix := 'org_' || p_organization_id::TEXT || '%';
    
    -- Calculate from storage.objects
    SELECT 
        COALESCE(SUM((metadata->>'size')::BIGINT), 0),
        COUNT(*)
    INTO v_total_bytes, v_file_count
    FROM storage.objects
    WHERE name LIKE v_bucket_prefix
    OR bucket_id IN (
        SELECT id FROM storage.buckets 
        WHERE name LIKE v_bucket_prefix
    );
    
    -- Update cache
    INSERT INTO public.storage_usage (organization_id, total_bytes, file_count, last_calculated_at)
    VALUES (p_organization_id, v_total_bytes, v_file_count, NOW())
    ON CONFLICT (organization_id) DO UPDATE
    SET 
        total_bytes = EXCLUDED.total_bytes,
        file_count = EXCLUDED.file_count,
        last_calculated_at = NOW(),
        updated_at = NOW();
    
    RETURN QUERY SELECT v_total_bytes, v_file_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function: Get storage limit for org (from usage_limits)
CREATE OR REPLACE FUNCTION public.get_org_storage_limit(p_organization_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_limit_gb INTEGER;
BEGIN
    SELECT limit_value INTO v_limit_gb
    FROM public.usage_limits
    WHERE organization_id = p_organization_id
    AND engine = 'storage_gb';
    
    -- Default to 5GB if no limit set
    IF v_limit_gb IS NULL THEN
        v_limit_gb := 5;
    END IF;
    
    -- -1 means unlimited
    IF v_limit_gb = -1 THEN
        RETURN -1;
    END IF;
    
    -- Convert GB to bytes
    RETURN v_limit_gb::BIGINT * 1024 * 1024 * 1024;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: Check if upload is allowed
CREATE OR REPLACE FUNCTION public.check_storage_limit(
    p_organization_id UUID,
    p_file_size_bytes BIGINT
)
RETURNS TABLE(
    allowed BOOLEAN,
    current_usage_bytes BIGINT,
    limit_bytes BIGINT,
    remaining_bytes BIGINT,
    usage_percentage INTEGER
) AS $$
DECLARE
    v_current_usage BIGINT;
    v_limit BIGINT;
    v_remaining BIGINT;
    v_percentage INTEGER;
    v_allowed BOOLEAN;
BEGIN
    -- Get current usage from cache
    SELECT su.total_bytes INTO v_current_usage
    FROM public.storage_usage su
    WHERE su.organization_id = p_organization_id;
    
    -- If no cache, calculate
    IF v_current_usage IS NULL THEN
        SELECT calc.total_bytes INTO v_current_usage
        FROM public.calculate_org_storage(p_organization_id) calc;
    END IF;
    
    -- Get limit
    v_limit := public.get_org_storage_limit(p_organization_id);
    
    -- Unlimited?
    IF v_limit = -1 THEN
        v_allowed := TRUE;
        v_remaining := 9223372036854775807; -- Max BIGINT
        v_percentage := 0;
    ELSE
        v_remaining := GREATEST(0, v_limit - v_current_usage);
        v_allowed := (v_current_usage + p_file_size_bytes) <= v_limit;
        v_percentage := LEAST(100, ((v_current_usage::FLOAT / v_limit::FLOAT) * 100)::INTEGER);
    END IF;
    
    RETURN QUERY SELECT 
        v_allowed,
        v_current_usage,
        v_limit,
        v_remaining,
        v_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Increment storage usage (call after successful upload)
CREATE OR REPLACE FUNCTION public.increment_storage_usage(
    p_organization_id UUID,
    p_bytes BIGINT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.storage_usage (organization_id, total_bytes, file_count)
    VALUES (p_organization_id, p_bytes, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET 
        total_bytes = storage_usage.total_bytes + p_bytes,
        file_count = storage_usage.file_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: Decrement storage usage (call after delete)
CREATE OR REPLACE FUNCTION public.decrement_storage_usage(
    p_organization_id UUID,
    p_bytes BIGINT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.storage_usage
    SET 
        total_bytes = GREATEST(0, total_bytes - p_bytes),
        file_count = GREATEST(0, file_count - 1),
        updated_at = NOW()
    WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view storage usage" ON public.storage_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_storage_usage_org ON public.storage_usage(organization_id);

-- 9. Grants
GRANT SELECT ON public.storage_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_org_storage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_storage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_storage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_storage_usage TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_storage_usage TO service_role;

-- 10. Comments
COMMENT ON TABLE public.storage_usage IS 'Cached storage usage per organization';
COMMENT ON FUNCTION public.check_storage_limit IS 'Validates if upload is within limits before allowing';
