-- ============================================================
-- Migration: Backfill Employee Departments From Roles
-- Purpose: Replace placeholder employee.department values with
--          enterprise departments derived from assigned roles.
-- Tables touched: public.employee.
-- ============================================================

BEGIN;

WITH role_departments(role_name, department) AS (
  VALUES
    ('VP, Finance & Administration', 'Finance & Administration'),
    ('General Manager', 'Executive Management'),
    ('Administrative Officer', 'Finance & Administration'),
    ('Administrative Trainee', 'Finance & Administration'),
    ('IT and Drafting', 'IT and Drafting'),
    ('Engineering Division Manager', 'Engineering'),
    ('Engineering Supervisor', 'Engineering'),
    ('Department Manager', 'Engineering'),
    ('Head, Civil Works Group', 'Engineering'),
    ('Senior Engineer', 'Engineering'),
    ('Engineer', 'Engineering'),
    ('Electronic Engineer Trainee', 'Engineering'),
    ('Electronics Engineer Trainee', 'Engineering'),
    ('Senior Technician', 'Engineering'),
    ('Technician', 'Engineering'),
    ('Driver', 'Operations'),
    ('Equipment Operator', 'Operations'),
    ('Utilityman', 'Operations')
)
UPDATE public.employee employee
SET department = role_departments.department
FROM public.roles roles
JOIN role_departments
  ON role_departments.role_name = roles.role_name
WHERE employee.role_id = roles.role_id
  AND (
    employee.department IS NULL
    OR btrim(employee.department) = ''
    OR lower(btrim(employee.department)) = 'general'
  );

COMMIT;
