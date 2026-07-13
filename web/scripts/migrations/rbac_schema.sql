-- RBAC Schema Migration
-- Run this in Supabase SQL Editor
-- Backend is source of truth. Do not manually edit rows in production.

BEGIN;

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  role_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name text NOT NULL UNIQUE,
  description text,
  parent_role_id bigint REFERENCES public.roles(role_id),
  hierarchy_level integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  permission_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  permission_key text NOT NULL UNIQUE,
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 3. Create role_permissions join table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id bigint NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  permission_id bigint NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'ALL',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Add role_id to employee (nullable during migration)
ALTER TABLE public.employee
  ADD COLUMN IF NOT EXISTS role_id bigint REFERENCES public.roles(role_id);

-- 5. Backfill role_id from existing role text for employees
DO $$
DECLARE
  admin_role_id bigint;
  employee_role_id bigint;
BEGIN
  SELECT role_id INTO admin_role_id FROM public.roles WHERE role_name = 'admin';
  IF admin_role_id IS NULL THEN
    INSERT INTO public.roles (role_name, description, hierarchy_level, is_system)
    VALUES ('admin', 'System administrator with full access', 100, true)
    RETURNING role_id INTO admin_role_id;
  END IF;

  SELECT role_id INTO employee_role_id FROM public.roles WHERE role_name = 'employee';
  IF employee_role_id IS NULL THEN
    INSERT INTO public.roles (role_name, description, hierarchy_level, is_system)
    VALUES ('employee', 'Standard employee with basic access', 10, true)
    RETURNING role_id INTO employee_role_id;
  END IF;

  UPDATE public.employee
  SET role_id = admin_role_id
  WHERE LOWER(COALESCE(role, 'employee')) = 'admin'
    AND role_id IS NULL;

  UPDATE public.employee
  SET role_id = employee_role_id
  WHERE role_id IS NULL;
END $$;

-- 6. Seed permissions
INSERT INTO public.permissions (permission_key, module, action, description) VALUES
  ('employee.view', 'employee', 'view', 'View employee records'),
  ('employee.create', 'employee', 'create', 'Create new employee accounts'),
  ('employee.edit', 'employee', 'edit', 'Edit employee details'),
  ('employee.delete', 'employee', 'delete', 'Archive/delete employee records'),
  ('leave.create', 'leave', 'create', 'Submit leave requests'),
  ('leave.view', 'leave', 'view', 'View leave records'),
  ('leave.approve', 'leave', 'approve', 'Approve leave requests'),
  ('leave.reject', 'leave', 'reject', 'Reject leave requests'),
  ('business.create', 'business', 'create', 'Submit official business forms'),
  ('business.view', 'business', 'view', 'View business forms'),
  ('business.approve', 'business', 'approve', 'Approve business forms'),
  ('business.reject', 'business', 'reject', 'Reject business forms'),
  ('document.upload', 'document', 'upload', 'Upload documents'),
  ('document.view', 'document', 'view', 'View documents'),
  ('document.delete', 'document', 'delete', 'Delete documents'),
  ('document.download', 'document', 'download', 'Download documents'),
  ('announcement.create', 'announcement', 'create', 'Create announcements'),
  ('announcement.view', 'announcement', 'view', 'View announcements'),
  ('announcement.publish', 'announcement', 'publish', 'Publish announcements'),
  ('announcement.delete', 'announcement', 'delete', 'Delete announcements'),
  ('message.send', 'message', 'send', 'Send internal messages'),
  ('message.view', 'message', 'view', 'View internal messages'),
  ('ai.chat', 'ai', 'chat', 'Use AI assistant'),
  ('ai.analytics', 'ai', 'analytics', 'View AI analytics'),
  ('ai.logs', 'ai', 'logs', 'View AI chat logs'),
  ('settings.manage', 'settings', 'manage', 'Manage system settings'),
  ('audit.view', 'audit', 'view', 'View blockchain audit trail'),
  ('job.assign', 'job', 'assign', 'Assign jobs to employees'),
  ('job.view', 'job', 'view', 'View job assignments'),
  ('admin.manage', 'admin', 'manage', 'Full admin access')
ON CONFLICT (permission_key) DO NOTHING;

-- 7. Seed role_permissions for admin (ALL scope)
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'ALL'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 8. Seed role_permissions for employee
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'SELF'
FROM public.roles r
CROSS JOIN (
  SELECT permission_id FROM public.permissions WHERE permission_key IN (
    'employee.view', 'leave.create', 'leave.view',
    'business.create', 'business.view',
    'document.upload', 'document.view', 'document.download',
    'message.send', 'message.view',
    'ai.chat', 'job.view'
  )
) p
WHERE r.role_name = 'employee'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- Rollback (run separately if needed)
-- DROP TABLE IF EXISTS public.role_permissions CASCADE;
-- DROP TABLE IF EXISTS public.permissions CASCADE;
-- DROP TABLE IF EXISTS public.roles CASCADE;
-- ALTER TABLE public.employee DROP COLUMN IF EXISTS role_id;
