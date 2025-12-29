-- FIX: Enable ON DELETE CASCADE for critical organization tables

DO $$
BEGIN

    -- 1. Organization Settings
    ALTER TABLE organization_settings
    DROP CONSTRAINT IF EXISTS organization_settings_organization_id_fkey;

    ALTER TABLE organization_settings
    ADD CONSTRAINT organization_settings_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE;

    -- 2. Organization Members
    ALTER TABLE organization_members
    DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

    ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE;

    -- 3. Organization SaaS Products (Verticals)
    ALTER TABLE organization_saas_products
    DROP CONSTRAINT IF EXISTS organization_saas_products_organization_id_fkey;

    ALTER TABLE organization_saas_products
    ADD CONSTRAINT organization_saas_products_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE;

    -- 4. Clients
    ALTER TABLE clients
    DROP CONSTRAINT IF EXISTS clients_organization_id_fkey;

    ALTER TABLE clients
    ADD CONSTRAINT clients_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE;

    -- 5. Core Business Entities (Invoices, Quotes, Services)
    -- Invoices
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_fkey;
    ALTER TABLE invoices ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Quotes
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_organization_id_fkey;
    ALTER TABLE quotes ADD CONSTRAINT quotes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Services (Agency)
    ALTER TABLE services DROP CONSTRAINT IF EXISTS services_organization_id_fkey;
    ALTER TABLE services ADD CONSTRAINT services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Briefings
    ALTER TABLE briefings DROP CONSTRAINT IF EXISTS briefings_organization_id_fkey;
    ALTER TABLE briefings ADD CONSTRAINT briefings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- 6. Cleaning Vertical Entities
    -- Cleaning Services
    ALTER TABLE cleaning_services DROP CONSTRAINT IF EXISTS cleaning_services_organization_id_fkey;
    ALTER TABLE cleaning_services ADD CONSTRAINT cleaning_services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Staff Profiles
    ALTER TABLE cleaning_staff_profiles DROP CONSTRAINT IF EXISTS cleaning_staff_profiles_organization_id_fkey;
    ALTER TABLE cleaning_staff_profiles ADD CONSTRAINT cleaning_staff_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Appointments
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_organization_id_fkey;
    ALTER TABLE appointments ADD CONSTRAINT appointments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Worker Logs
    -- Note: Ensure table exists before running
    BEGIN
        ALTER TABLE worker_logs DROP CONSTRAINT IF EXISTS worker_logs_organization_id_fkey;
        ALTER TABLE worker_logs ADD CONSTRAINT worker_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
        -- Handle case
        NULL;
    WHEN undefined_table THEN
        RAISE NOTICE 'Skipping worker_logs (table not found)';
    END;

    RAISE NOTICE 'Constraints updated with ON DELETE CASCADE for ALL entities.';

END $$;
