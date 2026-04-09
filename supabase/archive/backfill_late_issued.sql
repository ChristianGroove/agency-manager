
-- Update invoices that are linked to a billing cycle
-- and were issued more than 4 days AFTER the cycle ended.
UPDATE invoices
SET 
  is_late_issued = TRUE,
  metadata = jsonb_set(
    COALESCE(invoices.metadata, '{}'::jsonb),
    '{cycle_period}',
    jsonb_build_object(
      'start', billing_cycles.start_date,
      'end', billing_cycles.end_date
    )
  )
FROM billing_cycles
WHERE 
  invoices.id = billing_cycles.invoice_id
  AND invoices.date > (billing_cycles.end_date::date + INTERVAL '4 days')
  AND invoices.is_late_issued IS DISTINCT FROM TRUE;

-- Verify results
SELECT 
  invoices.number, 
  invoices.date as issued_at, 
  billing_cycles.end_date as cycle_end, 
  invoices.is_late_issued
FROM invoices
JOIN billing_cycles ON invoices.id = billing_cycles.invoice_id
WHERE invoices.is_late_issued = TRUE
ORDER BY invoices.date DESC;
