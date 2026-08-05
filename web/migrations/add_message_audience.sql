-- ============================================================
-- Migration: Add audience targeting to messages (email table)
-- Purpose: Reuse the same visibility model as announcements:
--          visibility_scope + visibility_target.
-- Mapping:
--          Both      -> ORGANIZATION, target NULL
--          Admin     -> DEPARTMENT, target 'Administration'
--          Engineering -> DEPARTMENT, target 'Engineering'
-- ============================================================

BEGIN;

ALTER TABLE public.email
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN IF NOT EXISTS visibility_target text NULL;

UPDATE public.email
SET visibility_scope = 'ORGANIZATION',
    visibility_target = NULL
WHERE visibility_scope = 'ORGANIZATION'
  AND visibility_target IS NULL;

UPDATE public.email
SET visibility_scope = 'DEPARTMENT',
    visibility_target = 'Administration'
WHERE visibility_target = 'Administration';

UPDATE public.email
SET visibility_scope = 'DEPARTMENT',
    visibility_target = 'Engineering'
WHERE visibility_target = 'Engineering';

COMMIT;
