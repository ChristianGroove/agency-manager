-- 1. Migrate Subscriptions to Services
INSERT INTO public.services (client_id, name, description, status, start_date, type)
SELECT
    s.client_id,
    s.name,
    'Migrated Subscription: ' || s.service_type || ' (' || s.frequency || ')' as description,
    s.status,
    s.start_date,
    CASE
        WHEN s.frequency = 'one-time' THEN 'one_off'
        ELSE 'recurring'
    END as type
FROM public.subscriptions s
WHERE NOT EXISTS (
    SELECT 1 FROM public.services new_s
    WHERE new_s.client_id = s.client_id AND new_s.name = s.name
);

-- 2. Migrate Hosting Accounts to Services
INSERT INTO public.services (client_id, name, description, status, start_date, end_date, type)
SELECT
    h.client_id,
    'Hosting: ' || h.domain as name,
    'Provider: ' || h.provider || '. Renewal: ' || h.renewal_date as description,
    h.status,
    h.start_date,
    h.renewal_date as end_date,
    'recurring' as type
FROM public.hosting_accounts h
WHERE NOT EXISTS (
    SELECT 1 FROM public.services new_s
    WHERE new_s.client_id = h.client_id AND new_s.name = ('Hosting: ' || h.domain)
);

-- 3. Attempt to link existing Invoices to the new Services (Heuristic Match)
DO $$
DECLARE
    svc RECORD;
BEGIN
    FOR svc IN SELECT * FROM public.services LOOP
        -- Update invoices that match the service name in their description/items (approximate text match)
        -- This is a best-effort link for legacy data
        UPDATE public.invoices
        SET service_id = svc.id
        WHERE client_id = svc.client_id
          AND service_id IS NULL
          -- Matches if invoice items jsonb contains the service name (simplified check)
          -- OR if we just assume unlinked invoices for the client might belong to available services? No, risky.
          -- Let's try a distinct name match if possible.
          -- Since `items` is JSONB array of objects {description: ...}, we cast to text.
          AND items::text ILIKE '%' || svc.name || '%';
    END LOOP;
END $$;
