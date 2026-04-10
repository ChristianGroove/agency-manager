-- Debug: Check if there are any work logs
SELECT COUNT(*) as total_logs FROM staff_work_logs;

-- Check work logs with details
SELECT 
    wl.id,
    wl.start_time,
    wl.end_time,
    wl.total_hours,
    wl.calculated_amount,
    wl.log_type,
    sp.first_name || ' ' || sp.last_name as staff_name
FROM staff_work_logs wl
LEFT JOIN cleaning_staff_profiles sp ON sp.id = wl.staff_id
ORDER BY wl.start_time DESC
LIMIT 10;

-- Check appointments that should have work logs
SELECT 
    a.id,
    a.title,
    a.status,
    a.start_time,
    a.end_time,
    a.service_vertical,
    sp.first_name || ' ' || sp.last_name as staff_name
FROM appointments a
LEFT JOIN cleaning_staff_profiles sp ON sp.id = a.staff_id
WHERE a.service_vertical = 'cleaning'
  AND a.status = 'completed'
ORDER BY a.start_time DESC
LIMIT 10;
