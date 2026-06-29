# JEDDSpace Recent Changes Summary

This is a concise review handoff for ChatGPT.

## What changed recently

### Job assignment
- Refactored the Assign New Job flow to use a selected employee instead of department-based selection.
- The job form now loads selectable employees from `employeeService.getFieldWorkers()`.
- Job creation now includes `department` so the `job.department` NOT NULL constraint is satisfied.
- Recommendation cards can be applied directly to `selectedEmployee`.

### Recommendation logic
- Updated the recommendation service to score active employees using:
  - availability
  - current workload
  - service history
- The recommendation button text and card labels were updated to match the worker-based flow.

### Employee creation and auth
- Fixed employee auto-creation and signup insertion paths so required employee fields do not fail on null values.
- Added safe fallback values for missing first/last name data.
- Explicitly set `employee_type` to a default staff value in employee creation paths where needed.
- Kept `role` as the permissions field for admin checks.

### Profile and sidebar fixes
- Fixed the sidebar admin check to use `role === 'admin'`.
- Fixed profile account updates so missing profile fields do not overwrite required employee columns with nulls.
- Profile page remains responsible for identity, verification, sessions, API key display, and password/status updates.

### Manage Employees cleanup
- Removed unused department/role/position form state from the manage-employees add flow.
- The add-employee form now only collects the fields it still needs.

## Current architecture snapshot
- Frontend: React + Vite in `web/`.
- Data access: Supabase services in `web/src/services/`.
- Auth/profile flow: `authContext.jsx`, `authService.js`, `profileService.js`.
- Access control: `employee.role` for admin gating.
- Job assignment/recommendations: `employeeService.js`, `recommendationService.js`, `jobsService.js`, `assignJobsPage.jsx`.
- Authoritative schema: `DATABASE_SCHEMA.md`.

## Important constraints
- Do not invent columns outside `DATABASE_SCHEMA.md`.
- Preserve Supabase-backed behavior.
- Keep employee/job writes defensive so not-null constraints are not violated.
- Prefer minimal changes to services and pages over broad rewrites.

## Evaluation note
- The main remaining check is whether the live Supabase database matches the updated schema exactly, especially around `employee_type` and any employee defaults.
- If the live DB diverges, the code should follow the real database, not the outdated assumption.
