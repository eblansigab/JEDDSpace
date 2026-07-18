-- Migration: Add is_protected column to roles table
-- Run this in Supabase SQL Editor or via migration tool
-- This makes role protection explicit instead of relying on hierarchy_level === 1

ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false;

-- Protect the existing VP Finance role (hierarchy_level = 1)
UPDATE public.roles
SET is_protected = true
WHERE hierarchy_level = 1;

-- Optional: Add a comment to the column
COMMENT ON COLUMN public.roles.is_protected IS 'Indicates whether this role is a protected system role that cannot be modified by administrators.';
