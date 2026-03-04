-- Quick fix: Apply only new AI/Assignment migrations
-- Run these in Supabase SQL Editor: https://supabase.com/dashboard/project/amwlwmkejdjskukdfwut/sql

-- 1. First, run this to check if tables already exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_availability', 'assignment_rules', 'ai_suggestions', 'conversation_intents');

-- If they DON'T exist, run the migrations.
-- If they DO exist, skip to the fix conversation issue below.
