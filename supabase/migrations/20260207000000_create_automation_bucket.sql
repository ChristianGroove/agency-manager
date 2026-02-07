-- Create storage bucket for automation media (campaigns, broadcasts, flows)
insert into storage.buckets (id, name, public)
values ('automation-media', 'automation-media', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files to automation-media
create policy "Authenticated users can upload automation media"
on storage.objects for insert
with check (
  bucket_id = 'automation-media' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view files in automation-media
create policy "Authenticated users can view automation media"
on storage.objects for select
using (
  bucket_id = 'automation-media' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files (optional, good for cleanup)
create policy "Authenticated users can delete own automation media"
on storage.objects for delete
using (
  bucket_id = 'automation-media' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text -- Assuming we use user ID or Org ID prefixes
);
