-- Add performance indexes for resto_orders queries by organization and table
CREATE INDEX IF NOT EXISTS idx_resto_orders_org ON public.resto_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_resto_orders_table ON public.resto_orders(table_id);
