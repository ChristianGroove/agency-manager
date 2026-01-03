-- FIX: Drop existing functions first, then re-run APPLY_THIS_CONSOLIDATED.sql
-- Execute esto PRIMERO en el SQL Editor

-- Drop triggers first (order matters)
DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
DROP TRIGGER IF EXISTS trigger_update_conversation_sentiment ON public.messages;

-- Drop functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS increment_agent_load(uuid) CASCADE;
DROP FUNCTION IF EXISTS decrement_agent_load(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_agent_load_on_assignment() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_sentiment() CASCADE;

-- Ahora ejecuta APPLY_THIS_CONSOLIDATED.sql completo
