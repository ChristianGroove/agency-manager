
SELECT id, connection_name, status, created_at, credentials 
FROM integration_connections 
WHERE credentials->>'phoneNumberId' = '990154037504132' 
   OR credentials->>'phone_number_id' = '990154037504132';
