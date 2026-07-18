-- Migration: Add inline image support for messages and announcements
-- Reuses existing `document` storage bucket
-- Images are stored permanently; UI-only edit/delete does not remove storage objects

-- 1. Message images attachment table
CREATE TABLE IF NOT EXISTS public.email_attachment (
  email_attachment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_id integer NOT NULL REFERENCES public.email(email_id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- 2. Announcement images
CREATE TABLE IF NOT EXISTS public.announcement_images (
  announcement_image_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id integer NOT NULL REFERENCES public.announcement(announcement_id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- 3. Announcement comments
CREATE TABLE IF NOT EXISTS public.announcement_comments (
  comment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id integer NOT NULL REFERENCES public.announcement(announcement_id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES public.employee(employee_id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  image_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- 4. Comment reactions
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  comment_reaction_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id integer NOT NULL REFERENCES public.announcement_comments(comment_id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES public.employee(employee_id) ON DELETE CASCADE,
  reaction_type character varying NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  UNIQUE (comment_id, employee_id)
);

-- 5. New permissions for inline media and comments
-- Use a DO block to avoid duplicate inserts since (module, action) has no unique constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Messages' AND action = 'Send Message Images') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Messages', 'Send Message Images', 'Upload and send images inside internal messages');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Messages' AND action = 'React to Message Images') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Messages', 'React to Message Images', 'Add reactions to images in messages');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Announcements' AND action = 'Post Announcement Images') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Announcements', 'Post Announcement Images', 'Upload images to announcements');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Announcements' AND action = 'React to Announcement Images') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Announcements', 'React to Announcement Images', 'Add reactions to images in announcements');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Announcements' AND action = 'Comment on Announcements') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Announcements', 'Comment on Announcements', 'Add comments to announcements');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Announcements' AND action = 'Comment with Images') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Announcements', 'Comment with Images', 'Upload images inside announcement comments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Announcements' AND action = 'React to Comments') THEN
    INSERT INTO public.permissions (module, action, description) VALUES ('Announcements', 'React to Comments', 'Add reactions to announcement comments');
  END IF;
END $$;
