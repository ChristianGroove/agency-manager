UPDATE invoices
SET due_date = NOW() - INTERVAL '1 day', status = 'overdue'
WHERE number = 'INV-1765929102923';
