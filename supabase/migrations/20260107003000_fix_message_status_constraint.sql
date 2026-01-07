-- Migration: Allow 'received' status in messages table
-- Fixes constraint violation: new row for relation "messages" violates check constraint "messages_status_check"

-- 1. Drop existing check constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;

-- 2. Add new check constraint with 'received'
ALTER TABLE messages ADD CONSTRAINT messages_status_check 
CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'received'));
