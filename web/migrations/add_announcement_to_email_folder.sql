-- Migration: Add announcement value to email_folder enum
-- This fixes the "invalid input value for enum email_folder: announcement" error
-- when posting announcements that send notification emails

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_folder') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'announcement' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'email_folder')) THEN
      ALTER TYPE email_folder ADD VALUE 'announcement';
    END IF;
  END IF;
END $$;
