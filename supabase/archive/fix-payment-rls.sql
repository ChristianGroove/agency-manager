-- Allow authenticated users (Admins) to view payment transactions
create policy "Authenticated users can view payment transactions"
  on public.payment_transactions for select
  to authenticated
  using (true);
