-- Migration: Fix Provider Keys
-- Standardizes legacy provider keys to match the Marketplace catalog

-- 1. Update legacy WhatsApp keys
UPDATE public.integration_connections
SET provider_key = 'meta_whatsapp'
WHERE provider_key = 'whatsapp';

-- 2. Update legacy Evolution keys
UPDATE public.integration_connections
SET provider_key = 'evolution_api'
WHERE provider_key = 'evolution';

-- 3. Re-link provider_id for any connections that might have been missed or just updated
UPDATE public.integration_connections ic
SET provider_id = ip.id
FROM public.integration_providers ip
WHERE ic.provider_key = ip.key
  AND (ic.provider_id IS NULL OR ic.provider_id != ip.id);

-- 4. Ensure created_at/updated_at are valid (cleanup)
UPDATE public.integration_connections
SET updated_at = now()
WHERE updated_at IS NULL;
