-- Enhance system_modules for App Store functionality
-- Add pricing, visual metadata, dependencies, and AI-related fields

ALTER TABLE system_modules 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS is_addon BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_module_key TEXT REFERENCES system_modules(key), -- For addons like "WhatsApp" for "Inbox"
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]', -- Array of module_keys required
ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]', -- Array of strings for AI pitch
ADD COLUMN IF NOT EXISTS icon_name TEXT, -- Lucide icon name string
ADD COLUMN IF NOT EXISTS visual_metadata JSONB DEFAULT '{"x": 0, "y": 0}'; -- For canvas positioning

-- Add some initial data for existing modules to populate the store
-- This is an UPSERT operation to ensure these modules exist with correct metadata

INSERT INTO system_modules (key, name, description, category, price, is_core, dependencies, benefits, icon_name, visual_metadata)
VALUES 
    (
        'module_crm', 
        'CRM & Sales', 
        'Advanced Lead Management and Sales Pipelines', 
        'operations', 
        29.00, 
        false, 
        '["core_clients"]',
        '["Track every lead source", "Automate follow-ups", "Visual Pipeline"]',
        'Target',
        '{"x": 100, "y": 100}'
    ),
    (
        'module_automation', 
        'Workflow Automation', 
        'Automate your entire business logic', 
        'automation', 
        49.00, 
        false, 
        '[]',
        '["Save 20+ hours/week", "Eliminate human error", "Connect all your apps"]',
        'Bot',
        '{"x": 400, "y": 100}'
    ),
    (
        'module_invoicing', 
        'Smart Invoicing', 
        'Create and send professional invoices', 
        'finance', 
        19.00, 
        false, 
        '["core_clients"]',
        '["Get paid 2x faster", "Automated reminders", "Tax compliance"]',
        'FileText',
        '{"x": 100, "y": 300}'
    ),
    (
        'module_payments', 
        'Payments Gateway', 
        'Accept credit cards and online payments', 
        'finance', 
        15.00, 
        false, 
        '["module_invoicing"]',
        '["Secure transactions", "Low fees", "Instant reconciliation"]',
        'CreditCard',
        '{"x": 400, "y": 300}'
    ),
    (
        'module_briefings', 
        'Project Briefings', 
        'Standardize client requirements', 
        'operations', 
        0.00, 
        false, 
        '[]',
        '["Clear requirements", "Happy clients", "Faster delivery"]',
        'Briefcase',
        '{"x": 250, "y": 200}'
    ),
     (
        'module_catalog', 
        'Service Catalog', 
        'Showcase your services and products', 
        'operations', 
        0.00, 
        false, 
        '[]',
        '["Standardized pricing", "Easy upselling", "Visual menu"]',
        'Store',
        '{"x": 250, "y": 400}'
    )
ON CONFLICT (key) DO UPDATE SET 
    price = EXCLUDED.price,
    dependencies = EXCLUDED.dependencies,
    benefits = EXCLUDED.benefits,
    icon_name = EXCLUDED.icon_name,
    visual_metadata = EXCLUDED.visual_metadata;
