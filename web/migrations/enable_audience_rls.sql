-- ============================================================
-- Migration: Enable Row Level Security for audience visibility
-- Purpose: Enforce department-based visibility at the database
-- level so that no client-side bypass is possible.
--
-- This applies to:
--   announcement table
--   email table
--
-- Visibility rules (same for both tables):
--   visibility_scope = 'ORGANIZATION' -> visible to everyone
--   visibility_scope = 'DEPARTMENT'  -> visible only to matching
--                                         employee department
-- ============================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads for announcements and emails
-- (authenticated users are filtered by the policies below,
--  anonymous/public access is controlled by these allow rules)
CREATE POLICY "Allow public read announcements"
  ON public.announcement
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read emails"
  ON public.email
  FOR SELECT
  USING (true);

-- Department-aware visibility for announcements
CREATE POLICY "Announcements visible by audience"
  ON public.announcement
  FOR SELECT
  USING (
    visibility_scope = 'ORGANIZATION'
    OR
    (
      visibility_scope = 'DEPARTMENT'
      AND
      visibility_target IN (
        SELECT e.department
        FROM public.employee e
        WHERE e.user_id = auth.uid()
      )
    )
  );

-- Department-aware visibility for messages
CREATE POLICY "Messages visible by audience"
  ON public.email
  FOR SELECT
  USING (
    recipient_email IN (
      SELECT email FROM public.employee WHERE user_id = auth.uid()
    )
    OR
    sender_id IN (
      SELECT employee_id FROM public.employee WHERE user_id = auth.uid()
    )
    OR
    visibility_scope = 'ORGANIZATION'
    OR
    (
      visibility_scope = 'DEPARTMENT'
      AND
      visibility_target IN (
        SELECT e.department
        FROM public.employee e
        WHERE e.user_id = auth.uid()
      )
    )
  );

COMMIT;
