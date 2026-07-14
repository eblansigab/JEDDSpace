-- ============================================================
-- JEDDSpace RBAC Reference Data Seed
-- Source of truth: 4 CSV files in project root
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ROLES
-- ============================================================
TRUNCATE TABLE public.role_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.roles RESTART IDENTITY CASCADE;

INSERT INTO public.roles (role_name, hierarchy_level, parent_role_id, description) VALUES
('VP, Finance & Administration', 1, NULL, 'Highest operational authority of the HRMS.'),
('General Manager', 2, 1, 'Oversees company operations and coordinates all departments.'),
('Administrative Officer', 3, 2, 'Handles HR administration, employee records, leave processing.'),
('IT and Drafting', 3, 2, 'Manages IT infrastructure, technical support, drafting.'),
('Engineering Division Manager', 3, 2, 'Heads the Engineering Division.'),
('Engineering Supervisor', 4, 5, 'Supervises engineering teams and field operations.'),
('Department Manager', 4, 5, 'Oversees department-level operations.'),
('Head, Civil Works Group', 4, 5, 'Leads Civil Works personnel.'),
('Senior Engineer', 5, 6, 'Senior engineering personnel.'),
('Engineer', 6, 9, 'Engineering personnel for project implementation.'),
('Senior Technician', 6, 6, 'Leads technical field personnel.'),
('Technician', 7, 11, 'Performs installation, maintenance, commissioning.'),
('Electronic Engineer Trainee', 8, 10, 'Engineering trainee.'),
('Administrative Trainee', 8, 4, 'Administrative trainee.'),
('Driver', 7, 6, 'Operates company vehicles.'),
('Equipment Operator', 7, 6, 'Operates heavy equipment.'),
('Utilityman', 8, 6, 'Provides operational support.');

-- ============================================================
-- 2. PERMISSIONS
-- ============================================================
INSERT INTO public.permissions (module, action, description) VALUES
('Employee Management', 'Add Employee', 'Create new employee records'),
('Employee Management', 'Manage Employee Profile', 'Update employee information'),
('Employee Management', 'Change Employee Role', 'Assign or modify employee roles'),
('Projects', 'Manage Projects', 'Create and manage projects'),
('Projects', 'Assign Employees', 'Assign employees to projects'),
('Projects', 'View Project Archives', 'View archived projects'),
('Leave & Official Business', 'View Requests', 'View leave and OB requests'),
('Leave & Official Business', 'Manage Requests', 'Approve or reject requests'),
('Blockchain Integrity', 'Audit Blockchain Records', 'View blockchain audit logs'),
('Blockchain Integrity', 'Verify Integrity', 'Verify document hashes'),
('Announcements', 'Create Announcements', 'Create announcements'),
('Announcements', 'Manage Announcements', 'Edit or archive announcements'),
('AI Analytics', 'View AI Analytics', 'View AI statistics'),
('AI Chat Logs', 'View Conversation History', 'View AI conversations'),
('AI Chat Logs', 'View User Activity', 'View users of AI'),
('AI Chat Logs', 'View Intent Classification', 'View detected intents');

-- ============================================================
-- 3. ROLE_PERMISSIONS
-- ============================================================
-- Helper: map role_name -> role_id, permission (module, action) -> permission_id
-- Generated from 03_Role_Permissions.csv

INSERT INTO public.role_permissions (role_id, permission_id, scope) VALUES
-- VP, Finance & Administration (role_id = 1)
(1, 1, 'ALL'),
(1, 2, 'ALL'),
(1, 3, 'ALL'),
(1, 4, 'ALL'),
(1, 5, 'ALL'),
(1, 6, 'ALL'),
(1, 7, 'ALL'),
(1, 8, 'ALL'),
(1, 9, 'ALL'),
(1, 10, 'ALL'),
(1, 11, 'ALL'),
(1, 12, 'ALL'),
(1, 13, 'ALL'),
(1, 14, 'ALL'),
(1, 15, 'ALL'),
(1, 16, 'ALL'),

-- General Manager (role_id = 2)
(2, 1, 'ALL'),
(2, 2, 'DEPARTMENT'),
(2, 3, 'DEPARTMENT'),
(2, 4, 'ALL'),
(2, 5, 'ALL'),
(2, 6, 'ALL'),
(2, 7, 'ALL'),
(2, 8, 'DEPARTMENT'),
(2, 9, 'ALL'),
(2, 10, 'ALL'),
(2, 11, 'ALL'),
(2, 12, 'ALL'),
(2, 13, 'ALL'),
(2, 14, 'ALL'),
(2, 15, 'ALL'),
(2, 16, 'ALL'),

-- Administrative Officer (role_id = 3)
(3, 1, 'ALL'),
(3, 2, 'DEPARTMENT'),
(3, 3, 'DEPARTMENT'),
(3, 4, 'ALL'),
(3, 5, 'ALL'),
(3, 6, 'ALL'),
(3, 7, 'ALL'),
(3, 8, 'DEPARTMENT'),
(3, 9, 'ALL'),
(3, 10, 'ALL'),
(3, 11, 'ALL'),
(3, 12, 'ALL'),
(3, 13, 'ALL'),
(3, 14, 'ALL'),
(3, 15, 'ALL'),
(3, 16, 'ALL'),

-- IT and Drafting (role_id = 4)
(4, 1, 'ALL'),
(4, 2, 'DEPARTMENT'),
(4, 3, 'DEPARTMENT'),
(4, 4, 'ALL'),
(4, 5, 'ALL'),
(4, 6, 'ALL'),
(4, 7, 'ALL'),
(4, 8, 'DEPARTMENT'),
(4, 9, 'ALL'),
(4, 10, 'ALL'),
(4, 11, 'ALL'),
(4, 12, 'ALL'),
(4, 13, 'ALL'),
(4, 14, 'ALL'),
(4, 15, 'ALL'),
(4, 16, 'ALL'),

-- Engineering Division Manager (role_id = 5)
(5, 4, 'DEPARTMENT'),
(5, 5, 'DEPARTMENT'),
(5, 6, 'DEPARTMENT'),
(5, 11, 'DEPARTMENT'),
(5, 12, 'DEPARTMENT'),

-- Engineering Supervisor (role_id = 6)
(6, 4, 'DEPARTMENT'),
(6, 5, 'DEPARTMENT'),
(6, 6, 'DEPARTMENT');

-- ============================================================
-- Verification queries (run after seed)
-- ============================================================
-- SELECT r.role_name, r.hierarchy_level, COUNT(rp.permission_id) AS perm_count
-- FROM public.roles r
-- LEFT JOIN public.role_permissions rp ON rp.role_id = r.role_id
-- GROUP BY r.role_id, r.role_name, r.hierarchy_level
-- ORDER BY r.hierarchy_level;