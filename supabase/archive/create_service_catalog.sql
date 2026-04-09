-- Create service_catalog table
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('recurring', 'one_off')),
    frequency TEXT CHECK (frequency IN ('monthly', 'biweekly', 'quarterly', 'semiannual', 'yearly')),
    base_price NUMERIC DEFAULT 0,
    is_visible_in_portal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.service_catalog
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert/update/delete for authenticated users (assuming all assumed authenticated are admins for now as per current simple auth model)
CREATE POLICY "Allow full access for authenticated users" ON public.service_catalog
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
