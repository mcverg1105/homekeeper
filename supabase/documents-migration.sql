-- Run in the Supabase SQL Editor.
-- Adds PDF document attachments to tasks, projects, and warranties.
-- Uses the existing private "images" bucket (path prefix = user id).

alter table tasks add column if not exists documents jsonb not null default '[]'::jsonb;
alter table projects add column if not exists documents jsonb not null default '[]'::jsonb;
alter table warranties add column if not exists documents jsonb not null default '[]'::jsonb;

-- Optional: restrict uploads in the images bucket to images + PDF only.
-- Run supabase/storage-bucket-mime-fix.sql if photos fail but PDFs work.
