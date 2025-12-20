-- Create a new storage bucket for invoices
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Allow public access to view invoices (needed for "View Invoice" link)
create policy "Public Access Invoices"
  on storage.objects for select
  using ( bucket_id = 'invoices' );

-- Allow authenticated users to upload invoices
create policy "Authenticated Upload Invoices"
  on storage.objects for insert
  with check ( bucket_id = 'invoices' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their uploads
create policy "Authenticated Update Invoices"
  on storage.objects for update
  using ( bucket_id = 'invoices' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete their uploads
create policy "Authenticated Delete Invoices"
  on storage.objects for delete
  using ( bucket_id = 'invoices' and auth.role() = 'authenticated' );
