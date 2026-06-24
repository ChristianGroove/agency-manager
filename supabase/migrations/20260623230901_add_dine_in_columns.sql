-- ============================================
-- MIGRACIÓN: Sistema de Cuenta Abierta Dine-In
-- ============================================

-- 1. Nuevas columnas en resto_orders
ALTER TABLE resto_orders 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES resto_table_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;

-- Index para consultas por sesión
CREATE INDEX IF NOT EXISTS idx_resto_orders_session_id ON resto_orders(session_id);

-- 2. Nuevas columnas en resto_table_sessions
ALTER TABLE resto_table_sessions 
  ADD COLUMN IF NOT EXISTS total_accumulated INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
