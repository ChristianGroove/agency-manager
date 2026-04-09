-- Check table definition (specifically constraints)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass;

-- Check if clients have user_id
SELECT id, name, user_id FROM clients LIMIT 5;
