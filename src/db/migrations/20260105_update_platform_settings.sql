-- Migration: Update Platform Settings with Production Domains
-- Date: 2026-01-05
-- Description: Sets the default admin and portal domains to the production values.

UPDATE platform_settings
SET 
  admin_domain = 'app.pixy.com.co',
  portal_domain = 'mi.pixy.com.co'
WHERE id = 1;

-- Verify and insert if missing (idempotency)
INSERT INTO platform_settings (id, agency_name, admin_domain, portal_domain)
VALUES (1, 'Agencia OS', 'app.pixy.com.co', 'mi.pixy.com.co')
ON CONFLICT (id) DO UPDATE SET
  admin_domain = 'app.pixy.com.co',
  portal_domain = 'mi.pixy.com.co';
