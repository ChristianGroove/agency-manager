-- ============================================
-- INACTIVE ACCOUNT CLEANUP SYSTEM
-- ============================================
-- Manages trial expiration, account suspension,
-- and automatic cleanup of inactive organizations
-- ============================================

-- 1. Add lifecycle columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dormant_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_warning_sent_at TIMESTAMP;

-- 2. Create lifecycle_notifications table
CREATE TABLE IF NOT EXISTS public.lifecycle_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (
        notification_type IN (
            'trial_ending_7d',
            'trial_ending_1d', 
            'trial_expired',
            'account_dormant',
            'account_suspended',
            'deletion_warning_30d',
            'deletion_warning_7d',
            'account_deleted'
        )
    ),
    sent_at TIMESTAMP DEFAULT NOW(),
    email_sent_to TEXT,
    UNIQUE(organization_id, notification_type)
);

-- 3. Trigger: Set trial_ends_at on new organization
CREATE OR REPLACE FUNCTION public.set_trial_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Set trial to 14 days from creation
    IF NEW.trial_ends_at IS NULL AND NEW.subscription_status IS DISTINCT FROM 'active' THEN
        NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_trial_expiry ON public.organizations;
CREATE TRIGGER trigger_set_trial_expiry
    BEFORE INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trial_expiry();

-- 4. Function: Update activity (call from app on user actions)
CREATE OR REPLACE FUNCTION public.record_org_activity(
    p_organization_id UUID,
    p_activity_type TEXT DEFAULT 'general',
    p_points INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.organizations
    SET 
        last_activity_at = NOW(),
        activity_score = activity_score + p_points,
        -- Reset dormant status if active
        dormant_at = CASE WHEN dormant_at IS NOT NULL THEN NULL ELSE dormant_at END,
        updated_at = NOW()
    WHERE id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Process trial expirations (call from cron)
CREATE OR REPLACE FUNCTION public.process_trial_expirations()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    action_taken TEXT
) AS $$
DECLARE
    r RECORD;
BEGIN
    -- Suspend expired trials
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE trial_ends_at < NOW()
        AND subscription_status IS DISTINCT FROM 'active'
        AND status = 'active'
    LOOP
        UPDATE public.organizations
        SET 
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        -- Log notification
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'trial_expired')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended';
        RETURN NEXT;
    END LOOP;
    
    -- Mark dormant (30 days no activity)
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE last_activity_at < NOW() - INTERVAL '30 days'
        AND status = 'active'
        AND dormant_at IS NULL
    LOOP
        UPDATE public.organizations
        SET 
            dormant_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_dormant')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'marked_dormant';
        RETURN NEXT;
    END LOOP;
    
    -- Suspend dormant after 60 days total inactivity
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE last_activity_at < NOW() - INTERVAL '60 days'
        AND status = 'active'
        AND dormant_at IS NOT NULL
    LOOP
        UPDATE public.organizations
        SET 
            status = 'suspended',
            suspended_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_suspended')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'suspended_dormant';
        RETURN NEXT;
    END LOOP;
    
    -- Schedule deletion (90 days suspended)
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE status = 'suspended'
        AND suspended_at < NOW() - INTERVAL '90 days'
        AND deletion_scheduled_at IS NULL
        AND subscription_status IS DISTINCT FROM 'active'
    LOOP
        UPDATE public.organizations
        SET 
            deletion_scheduled_at = NOW() + INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = r.id;
        
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'deletion_warning_30d')
        ON CONFLICT DO NOTHING;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'deletion_scheduled';
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: Execute scheduled deletions
CREATE OR REPLACE FUNCTION public.execute_scheduled_deletions()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    action_taken TEXT
) AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, name
        FROM public.organizations
        WHERE deletion_scheduled_at < NOW()
        AND deletion_scheduled_at IS NOT NULL
        AND subscription_status IS DISTINCT FROM 'active'
    LOOP
        -- Log before deletion
        INSERT INTO public.lifecycle_notifications (organization_id, notification_type)
        VALUES (r.id, 'account_deleted')
        ON CONFLICT DO NOTHING;
        
        -- Delete the organization (cascades to related data)
        DELETE FROM public.organizations WHERE id = r.id;
        
        org_id := r.id;
        org_name := r.name;
        action_taken := 'deleted';
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: Get accounts needing notification
CREATE OR REPLACE FUNCTION public.get_expiring_trials()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    owner_email TEXT,
    days_remaining INTEGER,
    notification_type TEXT
) AS $$
BEGIN
    -- 7 days warning
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        u.email,
        EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER,
        'trial_ending_7d'::TEXT
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id AND om.role = 'owner'
    JOIN auth.users u ON u.id = om.user_id
    LEFT JOIN public.lifecycle_notifications ln ON ln.organization_id = o.id AND ln.notification_type = 'trial_ending_7d'
    WHERE o.trial_ends_at BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
    AND o.subscription_status IS DISTINCT FROM 'active'
    AND ln.id IS NULL;
    
    -- 1 day warning
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        u.email,
        EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER,
        'trial_ending_1d'::TEXT
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id AND om.role = 'owner'
    JOIN auth.users u ON u.id = om.user_id
    LEFT JOIN public.lifecycle_notifications ln ON ln.organization_id = o.id AND ln.notification_type = 'trial_ending_1d'
    WHERE o.trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '2 days'
    AND o.subscription_status IS DISTINCT FROM 'active'
    AND ln.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.record_org_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_trial_expirations TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_scheduled_deletions TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expiring_trials TO service_role;

-- 9. RLS for lifecycle_notifications
ALTER TABLE public.lifecycle_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lifecycle notifications" ON public.lifecycle_notifications
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 10. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_trial_ends ON public.organizations(trial_ends_at) 
    WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_last_activity ON public.organizations(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_org_deletion_scheduled ON public.organizations(deletion_scheduled_at) 
    WHERE deletion_scheduled_at IS NOT NULL;

-- 11. Comments
COMMENT ON COLUMN public.organizations.trial_ends_at IS 'When trial period expires (14 days from creation)';
COMMENT ON COLUMN public.organizations.last_activity_at IS 'Last meaningful user activity timestamp';
COMMENT ON COLUMN public.organizations.activity_score IS 'Cumulative activity points for engagement scoring';
COMMENT ON COLUMN public.organizations.dormant_at IS 'When account was marked dormant (30 days inactive)';
COMMENT ON COLUMN public.organizations.suspended_at IS 'When account was suspended';
COMMENT ON COLUMN public.organizations.deletion_scheduled_at IS 'Scheduled hard deletion date';
COMMENT ON FUNCTION public.process_trial_expirations IS 'Run weekly via cron to process lifecycle transitions';
COMMENT ON FUNCTION public.execute_scheduled_deletions IS 'Run weekly via cron to delete scheduled orgs';
