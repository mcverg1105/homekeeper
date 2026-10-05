-- Run in Supabase SQL Editor if photo uploads fail but PDF uploads work.
-- Ensures the images bucket accepts both photos and PDFs.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf'
]::text[]
where id = 'images';
