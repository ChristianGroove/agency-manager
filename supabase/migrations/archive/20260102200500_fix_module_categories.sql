-- Fix system_modules category constraint and seed data

-- 1. Drop the existing constraint
ALTER TABLE system_modules DROP CONSTRAINT IF EXISTS system_modules_category_check;

-- 2. Add the new constraint with updated categories
ALTER TABLE system_modules 
ADD CONSTRAINT system_modules_category_check 
CHECK (category IN ('core', 'operations', 'automation', 'finance', 'config', 'sales', 'services', 'billing', 'projects', 'products'));

-- 3. Now we can safely insert/update the modules
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
    -- Re-adding modules that might be missing or need category update
    (
        'core_crm',
        'CRM / Leads',
        'Core CRM functionalities',
        'operations',
        0.00,
        true,
        '[]',
        '[]',
        'Users',
        '{"x": 0, "y": 0}'
    )
ON CONFLICT (key) DO UPDATE SET 
    price = EXCLUDED.price,
    category = EXCLUDED.category, -- Ensure category is updated
    dependencies = EXCLUDED.dependencies,
    benefits = EXCLUDED.benefits,
    icon_name = EXCLUDED.icon_name,
    visual_metadata = EXCLUDED.visual_metadata;
