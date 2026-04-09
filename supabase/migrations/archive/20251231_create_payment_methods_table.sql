-- 1. Create table for dynamic payment methods
CREATE TYPE payment_method_type AS ENUM ('MANUAL', 'GATEWAY');

CREATE TABLE IF NOT EXISTS public.organization_payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL, -- Intentionally NOT referencing organization(id) strictly if table missing in schema.sql, but logical link
    type payment_method_type NOT NULL DEFAULT 'MANUAL',
    title TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores account_number, bank_name, etc.
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS
ALTER TABLE public.organization_payment_methods ENABLE ROW LEVEL SECURITY;

-- Allow users to view methods of their organization
CREATE POLICY "Users can view payment methods of their organization" 
ON public.organization_payment_methods 
FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow admins to edit
CREATE POLICY "Admins can manage payment methods" 
ON public.organization_payment_methods 
FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- Allow PUBLIC/Portal read access via secure function or policy?
-- For portal, we usually use `supabaseAdmin` so RLS isn't the blocker, but if we wanted client-side fetch:
-- We'll rely on `getPortalData` which uses `supabaseAdmin`, so strict RLS is fine.

-- 3. Data Migration (Best Effort)
DO $$
DECLARE
    rec RECORD;
    col_exists BOOLEAN;
BEGIN
    -- Check if columns exist in organization_settings to migrate
    -- We loop through settings to migrate data
    FOR rec IN SELECT * FROM public.organization_settings LOOP
        
        -- Migrating Bancolombia
        BEGIN
            IF rec.bancolombia_account IS NOT NULL AND rec.bancolombia_account != '' THEN
                INSERT INTO public.organization_payment_methods (organization_id, type, title, details, display_order)
                VALUES (rec.organization_id, 'MANUAL', 'Bancolombia', jsonb_build_object('account_number', rec.bancolombia_account), 1);
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL; END; -- Ignore if column missing

        -- Migrating Nequi
        BEGIN
            IF rec.nequi_number IS NOT NULL AND rec.nequi_number != '' THEN
                INSERT INTO public.organization_payment_methods (organization_id, type, title, details, display_order)
                VALUES (rec.organization_id, 'MANUAL', 'Nequi', jsonb_build_object('account_number', rec.nequi_number), 2);
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- Migrating Daviplata
        BEGIN
            IF rec.daviplata_number IS NOT NULL AND rec.daviplata_number != '' THEN
                INSERT INTO public.organization_payment_methods (organization_id, type, title, details, display_order)
                VALUES (rec.organization_id, 'MANUAL', 'Daviplata', jsonb_build_object('account_number', rec.daviplata_number), 3);
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL; END;

    END LOOP;
END $$;
