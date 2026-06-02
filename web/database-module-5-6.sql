-- Module 5 support fields.
-- Run this in Supabase SQL Editor if these fields/status values do not exist yet.

alter type announcement_status add value if not exists 'Published';
alter type announcement_status add value if not exists 'Draft';
alter type announcement_status add value if not exists 'Archived';

alter table notification
  add column if not exists priority varchar default 'Normal';

alter table notification
  add column if not exists is_read boolean default false;
