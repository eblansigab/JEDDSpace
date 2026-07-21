-- ============================================================
-- Migration: Add employee_roles junction table (multi-role RBAC)
-- Purpose: Make employee_roles the single source of truth for
--          authorization. employee.role_id / employee.role remain
--          as organizational metadata (hierarchy, reporting,
--          approvals, department) and are NOT read for authz.
-- Tables touched: public.employee_roles (new), public.employee.
-- ============================================================

BEGIN;

-- 1. Create the junction table.
CREATE TABLE IF NOT EXISTS public.employee_roles (
  employee_role_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id       integer NOT NULL
                    REFERENCES public.employee(employee_id) ON DELETE CASCADE,
  role_id           bigint NOT NULL
                    REFERENCES public.roles(role_id) ON DELETE CASCADE,
  assigned_by       uuid REFERENCES public.employee(user_id),
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now(),
  UNIQUE (employee_id, role_id),
  CHECK (employee_id IS NOT NULL),
  CHECK (role_id IS NOT NULL)
);

COMMENT ON TABLE public.employee_roles IS
  'Maps employees to one or more roles. This is the source of truth for authorization.';
COMMENT ON COLUMN public.employee_roles.assigned_by IS
  'Employee user_id who assigned this role mapping.';
COMMENT ON COLUMN public.employee_roles.updated_at IS
  'Last time this mapping row was touched (insert or retention).';

-- 2. Backfill: one row per existing employee whose role_id is set.
INSERT INTO public.employee_roles (employee_id, role_id, assigned_by, created_at, updated_at)
SELECT
  e.employee_id,
  e.role_id,
  e.user_id,
  now(),
  now()
FROM public.employee e
WHERE e.role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_roles er
    WHERE er.employee_id = e.employee_id
      AND er.role_id = e.role_id
  );

-- 3. Normalize employee.department to the two agreed values.
--    Detailed departments become role metadata only (roleMetadata.js).
UPDATE public.employee
SET department = 'Administration'
WHERE lower(btrim(department)) IN (
  'finance & administration',
  'executive management',
  'it and drafting',
  'administration'
);

UPDATE public.employee
SET department = 'Engineering'
WHERE lower(btrim(department)) IN (
  'engineering',
  'operations'
);

COMMIT;
