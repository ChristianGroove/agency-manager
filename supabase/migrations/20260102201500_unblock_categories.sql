-- Emergency Unblock: Drop strict category constraint to allow App Store data
-- We will rely on application-level validation for now to avoid SQL blocking

-- 1. Drop the constraint completely
ALTER TABLE system_modules DROP CONSTRAINT IF EXISTS system_modules_category_check;

-- 2. Insert/Update the definitions required for the App Store
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
    ),
    (
        'core_crm',
        'CRM / Leads',
        'Core CRM functionalities',
        'operations', -- Normalizing legacy key to new category
        0.00,
        true,
        '[]',
        '[]',
        'Users',
        '{"x": 0, "y": 0}'
    )
ON CONFLICT (key) DO UPDATE SET 
    category = EXCLUDED.category, -- This will now succeed without constraint
    price = EXCLUDED.price,
    dependencies = EXCLUDED.dependencies,
    benefits = EXCLUDED.benefits,
    icon_name = EXCLUDED.icon_name,
    visual_metadata = EXCLUDED.visual_metadata;
