-- Phase 4.1: Message attachments
-- Run this in Supabase SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_attachment (
  email_attachment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_id integer NOT NULL REFERENCES public.email(email_id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMIT;
