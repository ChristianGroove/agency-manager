-- MIGRATION: 20260312_client_categories.sql
-- DESCRIPTION: Agrega el sistema de Categorías Dinámicas de Contactos

-- 1. Crear la tabla de categorías
CREATE TABLE IF NOT EXISTS public.client_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'slate', -- slate, indigo, emerald, rose, amber, etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name) -- Evitar nombres duplicados por organización
);

-- Habilitar RLS
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_categories
CREATE POLICY "Users can view categories of their organization" 
    ON public.client_categories FOR SELECT 
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert categories to their organization" 
    ON public.client_categories FOR INSERT 
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their organization categories" 
    ON public.client_categories FOR UPDATE 
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their organization categories" 
    ON public.client_categories FOR DELETE 
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ));

-- 2. Alterar tabla clients para agregar la relación
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.client_categories(id) ON DELETE SET NULL;

-- 3. Inyectar categoría 'General' para organizaciones con clientes existentes y asignar
DO $$
DECLARE
    org_record RECORD;
    new_cat_id UUID;
BEGIN
    FOR org_record IN SELECT DISTINCT organization_id FROM public.clients WHERE organization_id IS NOT NULL LOOP
        -- Crear la categoría 'Contacto' por defecto para esa org
        INSERT INTO public.client_categories (organization_id, name, color)
        VALUES (org_record.organization_id, 'Contacto', 'slate')
        ON CONFLICT (organization_id, name) DO NOTHING
        RETURNING id INTO new_cat_id;
        
        -- Si ya existía, buscar su ID
        IF new_cat_id IS NULL THEN
            SELECT id INTO new_cat_id FROM public.client_categories WHERE organization_id = org_record.organization_id AND name = 'Contacto';
        END IF;

        -- Actualizar todos los clientes de esa org que no tengan categoría asignada
        UPDATE public.clients SET category_id = new_cat_id WHERE organization_id = org_record.organization_id AND category_id IS NULL;
    END LOOP;
END $$;

-- 4. Actualizar el RPC get_paginated_clients para incluir category
CREATE OR REPLACE FUNCTION get_paginated_clients(
    p_org_id UUID,
    p_search TEXT DEFAULT '',
    p_status TEXT DEFAULT 'all',
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
    v_offset INT;
    v_result JSON;
BEGIN
    v_offset := (p_page - 1) * p_page_size;

    WITH client_metrics AS (
        SELECT 
            c.id AS client_id,
            c.name,
            c.company_name,
            c.logo_url,
            c.created_at,
            c.portal_token,
            c.portal_short_token,
            c.phone,
            c.email,
            c.category_id,
            (SELECT json_build_object('id', cc.id, 'name', cc.name, 'color', cc.color) FROM client_categories cc WHERE cc.id = c.category_id) AS category,
            (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id AND s.status = 'active' AND s.deleted_at IS NULL) +
            (SELECT COUNT(*) FROM subscriptions sub WHERE sub.client_id = c.id AND sub.status = 'active' AND sub.deleted_at IS NULL) AS active_services_count,
            (SELECT COALESCE(SUM(
                CASE WHEN i.status IN ('pending', 'overdue') AND i.due_date < CURRENT_DATE THEN i.total ELSE 0 END
            ), 0) FROM invoices i WHERE i.client_id = c.id AND i.deleted_at IS NULL) AS debt,
            (SELECT COALESCE(SUM(
                CASE WHEN i.status IN ('pending', 'overdue') AND (i.due_date IS NULL OR i.due_date >= CURRENT_DATE) THEN i.total ELSE 0 END
            ), 0) FROM invoices i WHERE i.client_id = c.id AND i.deleted_at IS NULL) AS future_debt
        FROM clients c
        WHERE c.organization_id = p_org_id AND c.deleted_at IS NULL
    ),
    client_status AS (
        SELECT 
            *,
            CASE 
                WHEN debt > 0 THEN 'overdue'
                WHEN future_debt > 0 THEN 'urgent'
                WHEN active_services_count = 0 THEN 'inactive'
                ELSE 'active'
            END AS computed_status
        FROM client_metrics
    ),
    filtered_clients AS (
        SELECT * FROM client_status
        WHERE 
            (p_search = '' OR name ILIKE '%' || p_search || '%' OR COALESCE(company_name, '') ILIKE '%' || p_search || '%')
            AND
            (p_status = 'all' OR computed_status = p_status)
    ),
    paged_clients AS (
        SELECT * FROM filtered_clients
        ORDER BY created_at DESC
        LIMIT p_page_size OFFSET v_offset
    ),
    enriched_clients AS (
        SELECT 
            pc.*,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', i.id, 'total', i.total, 'status', i.status, 'due_date', i.due_date, 
                    'number', i.number, 'pdf_url', i.pdf_url, 'deleted_at', i.deleted_at,
                    'billing_cycles', (SELECT json_build_object('start_date', bc.start_date, 'end_date', bc.end_date) FROM billing_cycles bc WHERE bc.id = i.billing_cycle_id)
                )) FROM invoices i WHERE i.client_id = pc.client_id AND i.deleted_at IS NULL
            ), '[]'::json) AS invoices,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', q.id, 'number', q.number, 'total', q.total, 'status', q.status, 'pdf_url', q.pdf_url, 'deleted_at', q.deleted_at
                )) FROM quotes q WHERE q.client_id = pc.client_id AND q.deleted_at IS NULL
            ), '[]'::json) AS quotes,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'status', h.status, 'renewal_date', h.renewal_date
                )) FROM hosting_accounts h WHERE h.client_id = pc.client_id
            ), '[]'::json) AS hosting_accounts,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', s.id, 'name', s.name, 'next_billing_date', s.next_billing_date, 'status', s.status, 'amount', s.amount, 'service_type', s.service_type, 'frequency', s.frequency, 'deleted_at', s.deleted_at
                )) FROM subscriptions s WHERE s.client_id = pc.client_id AND s.deleted_at IS NULL
            ), '[]'::json) AS subscriptions,
            COALESCE((
                SELECT json_agg(json_build_object(
                    'id', serv.id, 'status', serv.status, 'deleted_at', serv.deleted_at
                )) FROM services serv WHERE serv.client_id = pc.client_id AND serv.deleted_at IS NULL
            ), '[]'::json) AS services
        FROM paged_clients pc
    ),
    aggregated_data AS (
        SELECT 
            (SELECT COUNT(*) FROM client_status) AS count_all,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'overdue') AS count_overdue,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'urgent') AS count_urgent,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'active') AS count_active,
            (SELECT COUNT(*) FROM client_status WHERE computed_status = 'inactive') AS count_inactive,
            (SELECT COUNT(*) FROM filtered_clients) AS total_count,
            COALESCE((
                SELECT json_agg(row_to_json(ec))
                FROM enriched_clients ec
            ), '[]'::json) AS clients_data
    )
    SELECT json_build_object(
        'clients', clients_data,
        'totalCount', total_count,
        'counts', json_build_object(
            'all', count_all,
            'overdue', count_overdue,
            'urgent', count_urgent,
            'active', count_active,
            'inactive', count_inactive
        )
    ) INTO v_result
    FROM aggregated_data;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
