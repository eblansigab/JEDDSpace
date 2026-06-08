-- Run in Supabase SQL Editor for push alerts (Module 5.2.1)
-- Adjust enum values if your notification.type enum uses different labels.

-- 1) Ensure notification.type enum includes values used by the app
-- Uncomment and edit if your enum type name differs:
-- ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'general';
-- ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'announcement';
-- ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'job_assignment';
-- ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'employee_update';

-- 2) Row Level Security
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notification;
CREATE POLICY "Authenticated users can read notifications"
ON public.notification FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notification;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notification FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notification;
CREATE POLICY "Authenticated users can update notifications"
ON public.notification FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete old notifications" ON public.notification;
CREATE POLICY "Authenticated users can delete old notifications"
ON public.notification FOR DELETE
TO authenticated
USING (true);

-- 3) Realtime (instant bell + desktop push without waiting for poll)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification;
