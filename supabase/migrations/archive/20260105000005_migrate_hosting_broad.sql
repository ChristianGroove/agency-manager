-- MIGRATION: Migrate Legacy Hosting Services (Broad Search)

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
    'pendiente-dominio.com',
    name,
    next_billing_date,
    'Migrated Service (Broad)',
    'active'
FROM 
    public.services
WHERE 
    (
        name ILIKE '%hosting%' OR 
        name ILIKE '%host%' OR 
        name ILIKE '%servidor%' OR 
        name ILIKE '%server%' OR 
        name ILIKE '%vps%' OR 
        name ILIKE '%cloud%' OR 
        name ILIKE '%cpanel%' OR 
        name ILIKE '%dominio%' OR
        name ILIKE '%domain%' OR
        description ILIKE '%hosting%' OR
        description ILIKE '%cpanel%'
    )
    AND status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM public.hosting_accounts h 
        WHERE h.client_id = services.client_id 
        AND h.plan_name = services.name
    );
