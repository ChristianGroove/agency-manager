-- FIX: Tenant Total Deletion (Omega Cascade v4)
-- Description: FINAL exhaustive update for ALL multi-tenant tables.
-- Includes the missing 'messages' table and other edge-case dependencies.
-- Reason: Fix for Error 23503 on 'messages_organization_id_fkey'.

DO $$ 
BEGIN
    -- 1. MESSAGES (The missing link!)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_organization_id_fkey;
        BEGIN
            ALTER TABLE public.messages ADD CONSTRAINT messages_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 2. CONVERSATIONS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;
        BEGIN
            ALTER TABLE public.conversations ADD CONSTRAINT conversations_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 3. ORGANIZATION SAAS PRODUCTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_saas_products') THEN
        ALTER TABLE public.organization_saas_products DROP CONSTRAINT IF EXISTS organization_saas_products_organization_id_fkey;
        ALTER TABLE public.organization_saas_products ADD CONSTRAINT organization_saas_products_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 4. EMITTERS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emitters') THEN
        ALTER TABLE public.emitters DROP CONSTRAINT IF EXISTS emitters_organization_id_fkey;
        ALTER TABLE public.emitters ADD CONSTRAINT emitters_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 5. APPOINTMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_organization_id_fkey;
        ALTER TABLE public.appointments ADD CONSTRAINT appointments_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 6. STAFF PROFILES
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
        ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_organization_id_fkey;
        ALTER TABLE public.staff_profiles ADD CONSTRAINT staff_profiles_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 7. CRM TAGS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tags') THEN
        ALTER TABLE public.crm_tags DROP CONSTRAINT IF EXISTS crm_tags_organization_id_fkey;
        ALTER TABLE public.crm_tags ADD CONSTRAINT crm_tags_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 8. RE-RUN PREVIOUS CRITICAL ONES (Just in case they failed due to naming)
    
    -- Notifications
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_organization_id_fkey;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Organization Settings
    ALTER TABLE public.organization_settings DROP CONSTRAINT IF EXISTS organization_settings_organization_id_fkey;
    ALTER TABLE public.organization_settings ADD CONSTRAINT organization_settings_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

END $$;
