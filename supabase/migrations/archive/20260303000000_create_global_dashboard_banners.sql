-- Create the table for Global Dashboard Banners
CREATE TABLE IF NOT EXISTS public.global_dashboard_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_type TEXT NOT NULL UNIQUE, -- 'agency', 'cleaning', 'resto', 'reseller', 'all'
    title TEXT,
    description JSONB, -- Can store an array of tips for the fade-in effect
    cta_text TEXT,
    cta_url TEXT,
    media_type TEXT DEFAULT 'json_lottie', -- 'json_lottie' or 'image'
    media_url TEXT,
    layout_pos TEXT DEFAULT 'right', -- 'left', 'center', 'right'
    theme TEXT DEFAULT 'light', -- 'light', 'dark', 'brand_primary', 'brand_secondary'
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.global_dashboard_banners ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" 
ON public.global_dashboard_banners
FOR SELECT 
TO authenticated 
USING (true);

-- Allow full access to admins/owners
CREATE POLICY "Allow all access to admin users" 
ON public.global_dashboard_banners 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND platform_role IN ('superadmin', 'admin')
    )
);

-- Function to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_global_dashboard_banners_modtime 
BEFORE UPDATE ON public.global_dashboard_banners 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Insert initial dummy records for the 4 spaces disabled by default
INSERT INTO public.global_dashboard_banners (space_type, title, description, media_url, is_active)
VALUES
('agency', 'Bienvenido a tu Agencia', '["Gestiona clientes fácilmente", "Revisa tus finanzas", "Optimiza tu MRR"]', '/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json', false),
('resto', 'Bienvenido a Resto', '["Administra tus pedidos", "Gestiona tu menú en vivo", "Aumenta tus ventas"]', '/animations/cartoon-premium-box-illustration-2025-10-20-03-11-12-utc.json', false),
('cleaning', 'Bienvenido a Limpieza', '["Asigna citas de limpieza", "Rastrea a tu personal", "Mejora tu servicio"]', '/animations/cartoon-window-cleaning-service-illustration-2025-10-20-04-30-52-utc.json', false),
('reseller', 'Bienvenido Reseller', '["Vende más licencias", "Rastrea tus comisiones", "Expande tu red"]', '/animations/cartoon-airplane-animation-2025-10-20-02-23-50-utc.json', false)
ON CONFLICT (space_type) DO NOTHING;
