-- MIGRATION: Migrate Legacy Hosting Services to Hosting Accounts

INSERT INTO public.hosting_accounts (
    organization_id,
    client_id,
    domain_url,
    plan_name,
    renewal_date,
    provider_name,
    status
)
SELECT 
    organization_id,
    client_id,
    'pendiente-dominio.com', -- Default placeholder
    name,
    next_billing_date,
    'Migrated Service',
    'active'
FROM 
    public.services
WHERE 
    name ILIKE '%hosting%'
    AND status = 'active'
    -- Avoid duplicates based on client_id and plan_name (rough check)
    AND NOT EXISTS (
        SELECT 1 FROM public.hosting_accounts h 
        WHERE h.client_id = services.client_id 
        AND h.plan_name = services.name
    );

RAISE NOTICE 'Migrated hosting services to hosting_accounts table.';
