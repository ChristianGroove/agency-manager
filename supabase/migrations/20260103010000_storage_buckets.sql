-- Create storage bucket for chat attachments
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files
create policy "Authenticated users can upload chat attachments"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view files
create policy "Authenticated users can view chat attachments"
on storage.objects for select
using (
  bucket_id = 'chat-attachments' and
  auth.role() = 'authenticated'
);
