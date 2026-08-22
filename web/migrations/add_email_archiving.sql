-- Migration: Add archive support to email messages

ALTER TABLE public.email
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;