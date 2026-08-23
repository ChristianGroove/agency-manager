-- ==============================================================================
-- MIGRATION: 20260817000000_inventory_engine_and_atomic_rpc.sql
-- PURPOSE: Atomic Concurrency Stock Engine, RPC Decrement/Restore, and CTA Columns
-- MODULE: Universal Catalog (Pixy Agency Manager)
-- IDEMPOTENT: Safe to run multiple times without data loss
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADD DIRECT COLUMNS TO public.service_catalog
-- ------------------------------------------------------------------------------
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS cta_type TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS price_label_type TEXT DEFAULT 'price';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.service_catalog'::regclass 
        AND conname = 'service_catalog_cta_type_check'
    ) THEN
        ALTER TABLE public.service_catalog
        ADD CONSTRAINT service_catalog_cta_type_check 
        CHECK (cta_type = ANY (ARRAY['whatsapp'::text, 'buy'::text, 'info'::text, 'quote'::text, 'appointment'::text, 'portfolio'::text, 'add_to_cart'::text, 'cart'::text, 'booking'::text]));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_catalog_cta_type ON public.service_catalog USING btree (organization_id, cta_type);
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_lookup ON public.service_catalog_variants USING btree (organization_id, catalog_item_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_catalog_sku ON public.service_catalog USING btree (organization_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_catalog_variants_sku ON public.service_catalog_variants USING btree (organization_id, sku);

-- ------------------------------------------------------------------------------
-- 2. ATOMIC STOCK DECREMENT RPC (decrement_catalog_stock)
-- ------------------------------------------------------------------------------
-- Supports both parameter signatures via overloading
CREATE OR REPLACE FUNCTION public.decrement_catalog_stock(
    p_organization_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item RECORD;
    v_target_item RECORD;
    v_target_variant RECORD;
    v_requested_qty INTEGER;
    v_item_id UUID;
    v_variant_id UUID;
    v_allow_backorders BOOLEAN;
    v_track_inventory BOOLEAN;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_result_list JSONB := '[]'::jsonb;
    v_item_id_str TEXT;
    v_variant_id_str TEXT;
BEGIN
    -- Validate input
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', true, 'decremented_items', '[]'::jsonb);
    END IF;

    -- Iterate through each item requested
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Support both item_id and catalog_item_id property keys
        v_item_id_str := COALESCE(v_item.value->>'item_id', v_item.value->>'catalog_item_id', v_item.value->>'itemId', v_item.value->>'catalogItemId');
        IF v_item_id_str IS NULL OR v_item_id_str = '' OR v_item_id_str = 'null' THEN
            RAISE EXCEPTION 'ERR_INVALID_ITEM_ID: ID de producto inválido o no provisto.';
        END IF;
        v_item_id := v_item_id_str::UUID;

        v_variant_id_str := COALESCE(v_item.value->>'variant_id', v_item.value->>'variantId');
        v_variant_id := NULL;
        IF v_variant_id_str IS NOT NULL AND v_variant_id_str <> '' AND v_variant_id_str <> 'null' THEN
            v_variant_id := v_variant_id_str::UUID;
        END IF;
        
        v_requested_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);
        IF v_requested_qty <= 0 THEN
            v_requested_qty := 1;
        END IF;

        -- 1. Variant-Level Decrement
        IF v_variant_id IS NOT NULL THEN
            -- Lock variant row
            SELECT * INTO v_target_variant
            FROM public.service_catalog_variants
            WHERE id = v_variant_id
              AND catalog_item_id = v_item_id
              AND organization_id = p_organization_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'ERR_VARIANT_NOT_FOUND: Variante con ID % no existe en la organización.', v_variant_id;
            END IF;

            -- Lock parent item row to read backorder and low stock settings
            SELECT * INTO v_target_item
            FROM public.service_catalog
            WHERE id = v_item_id
              AND organization_id = p_organization_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Item con ID % no existe en la organización.', v_item_id;
            END IF;

            v_track_inventory := COALESCE(v_target_variant.track_inventory, v_target_variant.track_stock, v_target_item.track_inventory, v_target_item.track_stock, false);
            v_allow_backorders := COALESCE(v_target_item.allow_backorders, false);
            IF COALESCE((v_item.value->>'allow_backorders_override')::BOOLEAN, (v_item.value->>'allowBackordersOverride')::BOOLEAN, false) IS TRUE THEN
                v_allow_backorders := true;
            END IF;

            v_current_stock := COALESCE(v_target_variant.inventory_quantity, v_target_variant.stock_quantity, 0);

            -- Guard: Out of stock check
            IF v_track_inventory AND NOT v_allow_backorders THEN
                IF v_current_stock < v_requested_qty THEN
                    RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Stock insuficiente para "%" (Variante: "%"). Disponibles: %, Solicitadas: %.',
                        v_target_item.name, v_target_variant.name, v_current_stock, v_requested_qty;
                END IF;
            END IF;

            v_new_stock := v_current_stock - v_requested_qty;
            IF v_track_inventory AND NOT v_allow_backorders AND v_new_stock < 0 THEN
                v_new_stock := 0;
            END IF;

            -- Update Variant Row
            UPDATE public.service_catalog_variants
            SET inventory_quantity = v_new_stock,
                stock_quantity = v_new_stock,
                updated_at = now()
            WHERE id = v_variant_id;

            -- Synchronize parent variants JSONB array
            IF v_target_item.variants IS NOT NULL AND jsonb_typeof(v_target_item.variants) = 'array' THEN
                UPDATE public.service_catalog
                SET variants = (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN (elem->>'id')::UUID = v_variant_id THEN
                                elem || jsonb_build_object('inventory_quantity', v_new_stock, 'stock_quantity', v_new_stock)
                            ELSE elem
                        END
                    )
                    FROM jsonb_array_elements(v_target_item.variants) elem
                ),
                updated_at = now()
                WHERE id = v_item_id;
            END IF;

            v_result_list := v_result_list || jsonb_build_object(
                'item_id', v_item_id,
                'catalog_item_id', v_item_id,
                'variant_id', v_variant_id,
                'previous_stock', v_current_stock,
                'new_stock', v_new_stock,
                'decremented_quantity', v_requested_qty,
                'track_inventory', v_track_inventory
            );

        ELSE
            -- 2. Item-Level Decrement (Simple Product)
            SELECT * INTO v_target_item
            FROM public.service_catalog
            WHERE id = v_item_id
              AND organization_id = p_organization_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Item con ID % no existe en la organización.', v_item_id;
            END IF;

            v_track_inventory := COALESCE(v_target_item.track_inventory, v_target_item.track_stock, false);
            v_allow_backorders := COALESCE(v_target_item.allow_backorders, false);
            IF COALESCE((v_item.value->>'allow_backorders_override')::BOOLEAN, (v_item.value->>'allowBackordersOverride')::BOOLEAN, false) IS TRUE THEN
                v_allow_backorders := true;
            END IF;

            v_current_stock := COALESCE(v_target_item.inventory_quantity, v_target_item.stock_quantity, 0);

            -- Guard: Out of stock check
            IF v_track_inventory AND NOT v_allow_backorders THEN
                IF v_current_stock < v_requested_qty THEN
                    RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Stock insuficiente para "%". Disponibles: %, Solicitadas: %.',
                        v_target_item.name, v_current_stock, v_requested_qty;
                END IF;
            END IF;

            v_new_stock := v_current_stock - v_requested_qty;
            IF v_track_inventory AND NOT v_allow_backorders AND v_new_stock < 0 THEN
                v_new_stock := 0;
            END IF;

            -- Update Item Row
            UPDATE public.service_catalog
            SET inventory_quantity = v_new_stock,
                stock_quantity = v_new_stock,
                updated_at = now()
            WHERE id = v_item_id;

            v_result_list := v_result_list || jsonb_build_object(
                'item_id', v_item_id,
                'catalog_item_id', v_item_id,
                'variant_id', NULL,
                'previous_stock', v_current_stock,
                'new_stock', v_new_stock,
                'decremented_quantity', v_requested_qty,
                'track_inventory', v_track_inventory
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'decremented_items', v_result_list
    );
END;
$$;

-- Overload for (p_items JSONB, p_organization_id UUID)
CREATE OR REPLACE FUNCTION public.decrement_catalog_stock(
    p_items JSONB,
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.decrement_catalog_stock(p_organization_id, p_items);
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STOCK RESTORE RPC (restore_catalog_stock)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_catalog_stock(
    p_organization_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item RECORD;
    v_target_item RECORD;
    v_target_variant RECORD;
    v_requested_qty INTEGER;
    v_item_id UUID;
    v_variant_id UUID;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_result_list JSONB := '[]'::jsonb;
    v_item_id_str TEXT;
    v_variant_id_str TEXT;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', true, 'restored_items', '[]'::jsonb);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id_str := COALESCE(v_item.value->>'item_id', v_item.value->>'catalog_item_id', v_item.value->>'itemId', v_item.value->>'catalogItemId');
        IF v_item_id_str IS NOT NULL AND v_item_id_str <> '' AND v_item_id_str <> 'null' THEN
            v_item_id := v_item_id_str::UUID;
        ELSE
            CONTINUE;
        END IF;

        v_variant_id_str := COALESCE(v_item.value->>'variant_id', v_item.value->>'variantId');
        v_variant_id := NULL;
        IF v_variant_id_str IS NOT NULL AND v_variant_id_str <> '' AND v_variant_id_str <> 'null' THEN
            v_variant_id := v_variant_id_str::UUID;
        END IF;

        v_requested_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);
        IF v_requested_qty <= 0 THEN
            v_requested_qty := 1;
        END IF;

        IF v_variant_id IS NOT NULL THEN
            SELECT * INTO v_target_variant
            FROM public.service_catalog_variants
            WHERE id = v_variant_id
              AND catalog_item_id = v_item_id
              AND organization_id = p_organization_id
            FOR UPDATE;

            IF FOUND THEN
                v_current_stock := COALESCE(v_target_variant.inventory_quantity, v_target_variant.stock_quantity, 0);
                v_new_stock := v_current_stock + v_requested_qty;

                UPDATE public.service_catalog_variants
                SET inventory_quantity = v_new_stock,
                    stock_quantity = v_new_stock,
                    updated_at = now()
                WHERE id = v_variant_id;

                SELECT * INTO v_target_item
                FROM public.service_catalog
                WHERE id = v_item_id
                  AND organization_id = p_organization_id
                FOR UPDATE;

                IF FOUND AND v_target_item.variants IS NOT NULL AND jsonb_typeof(v_target_item.variants) = 'array' THEN
                    UPDATE public.service_catalog
                    SET variants = (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN (elem->>'id')::UUID = v_variant_id THEN
                                    elem || jsonb_build_object('inventory_quantity', v_new_stock, 'stock_quantity', v_new_stock)
                                ELSE elem
                            END
                        )
                        FROM jsonb_array_elements(v_target_item.variants) elem
                    ),
                    updated_at = now()
                    WHERE id = v_item_id;
                END IF;

                v_result_list := v_result_list || jsonb_build_object(
                    'item_id', v_item_id,
                    'catalog_item_id', v_item_id,
                    'variant_id', v_variant_id,
                    'previous_stock', v_current_stock,
                    'new_stock', v_new_stock,
                    'restored_quantity', v_requested_qty
                );
            END IF;
        ELSE
            SELECT * INTO v_target_item
            FROM public.service_catalog
            WHERE id = v_item_id
              AND organization_id = p_organization_id
            FOR UPDATE;

            IF FOUND THEN
                v_current_stock := COALESCE(v_target_item.inventory_quantity, v_target_item.stock_quantity, 0);
                v_new_stock := v_current_stock + v_requested_qty;

                UPDATE public.service_catalog
                SET inventory_quantity = v_new_stock,
                    stock_quantity = v_new_stock,
                    updated_at = now()
                WHERE id = v_item_id;

                v_result_list := v_result_list || jsonb_build_object(
                    'item_id', v_item_id,
                    'catalog_item_id', v_item_id,
                    'variant_id', NULL,
                    'previous_stock', v_current_stock,
                    'new_stock', v_new_stock,
                    'restored_quantity', v_requested_qty
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'restored_items', v_result_list
    );
END;
$$;

-- Overload for (p_items JSONB, p_organization_id UUID)
CREATE OR REPLACE FUNCTION public.restore_catalog_stock(
    p_items JSONB,
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.restore_catalog_stock(p_organization_id, p_items);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. GRANT EXECUTE ON RPC FUNCTIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.decrement_catalog_stock(UUID, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.decrement_catalog_stock(JSONB, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.restore_catalog_stock(UUID, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.restore_catalog_stock(JSONB, UUID) TO authenticated, service_role, anon;

COMMIT;
