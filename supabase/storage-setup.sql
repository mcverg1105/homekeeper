-- Run this in the Supabase SQL Editor before using image uploads.
-- Creates a private bucket and RLS policies scoped to auth.uid().

insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- Users can read their own files (path prefix = user id)
create policy "Users read own images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload to their own folder
create policy "Users upload own images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
create policy "Users delete own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
