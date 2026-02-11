
-- DIAGNOSE USER CONTEXT AND MEMBERSHIP
-- Run this in Supabase SQL Editor to check if a specific email has access

-- 1. Find User ID by Email (Replace with user's email if known, or list recent users)
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY last_sign_in_at DESC 
LIMIT 5;

-- 2. Check Organization Memberships for these users
SELECT 
    au.email,
    om.user_id,
    om.organization_id,
    o.name as organization_name,
    om.role
FROM auth.users au
LEFT JOIN public.organization_members om ON au.id = om.user_id
LEFT JOIN public.organizations o ON om.organization_id = o.id
WHERE au.email IS NOT NULL
ORDER BY au.last_sign_in_at DESC
LIMIT 10;

-- 3. Check Clients Table RLS visibility (simulate as specific user if possible, or just check count)
SELECT count(*) as total_clients FROM public.clients;

-- 4. Check specific org clients
SELECT count(*) as org_clients 
FROM public.clients 
WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2';
