-- Phase 4.1: Announcement RBAC visibility
-- Run this in Supabase SQL Editor

BEGIN;

ALTER TABLE public.announcement
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN IF NOT EXISTS visibility_target text;

COMMIT;
