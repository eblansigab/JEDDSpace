-- ============================================================
-- Migration: Add Application Access Permissions
-- ============================================================

-- 1. Insert new Application Access permissions (Idempotent)
INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Documents', 'Access the Documents page'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Documents');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Projects', 'Access the Projects page'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Projects');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'AI Assistant', 'Access the AI Assistant page'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'AI Assistant');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Announcements', 'Access the Announcements page'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Announcements');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Contracts', 'Access the Contracts page'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Contracts');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Notifications', 'Access Notifications'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Notifications');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Reports', 'Access Reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Reports');

INSERT INTO public.permissions (module, action, description)
SELECT 'Application Access', 'Admin Dashboard', 'Access the Admin Dashboard'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'Application Access' AND action = 'Admin Dashboard');

-- 2. Assign these permissions to standard roles (Idempotent)
-- Target Roles: VP Finance (1), General Manager (2), Administrative Officer (3), 
-- Administrative Trainee (14), Department Manager (7), Senior Engineer (9), 
-- Engineer (10), Electronic Engineer Trainee (13), Senior Technician (11), Technician (12)
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.role_id, p.permission_id, 'ALL'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_id IN (1, 2, 3, 14, 7, 9, 10, 13, 11, 12)
  AND p.module = 'Application Access'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );
