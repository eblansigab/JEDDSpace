-- Phase 4.1: Announcement seen tracking
-- Run this in Supabase SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS public.announcement_views (
  announcement_view_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id integer NOT NULL REFERENCES public.announcement(announcement_id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES public.employee(employee_id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (announcement_id, employee_id)
);

COMMIT;
