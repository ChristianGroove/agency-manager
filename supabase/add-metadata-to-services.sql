-- Add metadata column to services table
alter table public.services 
add column if not exists metadata jsonb default '{}'::jsonb;
