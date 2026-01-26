-- Server-Side Aggregation para Dashboard Metrics
-- Ejecutar en Supabase SQL Editor para crear función RPC optimizada

create or replace function get_agency_dashboard_metrics(p_org_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  total_revenue numeric;
  pending_payments numeric;
  total_overdue numeric;
  active_clients_count integer;
  debtors_list json;
begin
  -- 1. Calcular Totales (Ignoramos deleted_at to match logic strictly, but usually should exclude)
  -- Adding deleted_at is null check for consistency
  select coalesce(sum(total), 0) into total_revenue
  from invoices
  where organization_id = p_org_id and status = 'paid' and deleted_at is null;
  
  -- Pending: (Pending OR Draft) AND (Future OR Null Date)
  select coalesce(sum(total), 0) into pending_payments
  from invoices
  where organization_id = p_org_id 
  and status in ('pending', 'draft')
  and (due_date is null or due_date >= current_date)
  and deleted_at is null;
  
  -- Overdue: Status overdue OR ((Pending OR Draft) AND Past Date)
  select coalesce(sum(total), 0) into total_overdue
  from invoices
  where organization_id = p_org_id 
  and deleted_at is null
  and (
    status = 'overdue' 
    or (status in ('pending', 'draft') and due_date < current_date)
  );
  
  -- 2. Clientes Activos
  select count(*) into active_clients_count
  from clients
  where organization_id = p_org_id and deleted_at is null;
  
  -- 3. Lista de Deudores (Top 5)
  with debtor_stats as (
    select client_id, sum(total) as debt
    from invoices
    where organization_id = p_org_id 
    and deleted_at is null
    and (
      status = 'overdue' 
      or (status in ('pending', 'draft') and due_date < current_date)
    )
    group by client_id
  )
  select json_agg(t) into debtors_list
  from (
    select 
      c.id, 
      c.id, 
      c.name, 
      c.company_name, 
      c.company_name, 
      c.logo_url as image,
      ds.debt
    from debtor_stats ds
    join clients c on c.id = ds.client_id
    order by ds.debt desc
    limit 5
  ) t;
  
  return json_build_object(
    'revenue', total_revenue,
    'pending', pending_payments,
    'overdue', total_overdue,
    'clients_count', active_clients_count,
    'debtors', coalesce(debtors_list, '[]'::json)
  );
end;
$$;