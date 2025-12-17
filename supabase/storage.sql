-- Create a new storage bucket for client logos
insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true);

-- Allow public access to view logos
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'client-logos' );

-- Allow authenticated users to upload logos
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'client-logos' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their uploads
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'client-logos' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete their uploads
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'client-logos' and auth.role() = 'authenticated' );
