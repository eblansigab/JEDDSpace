# JEDDSpace Handover

## What This Project Is
JEDDSpace is a human resource management and document management system built as a capstone project.

The web app is a React + Vite frontend backed by Supabase Auth, Postgres, Storage, and Realtime. The app also includes session tracking, internal notifications, email logs, announcements, leave and official business forms, job assignments, and a profile/security area.

## Current Architecture

### Frontend
- `web/` is the active app.
- Routing lives in `web/src/routes/AppRoutes.jsx`.
- `ProtectedRoute` gates authenticated pages.
- `AdminRoute` gates admin-only pages.
- `DashboardLayout` wraps authenticated dashboard pages.
- Shared UI lives in `web/src/components/`.

### Services Layer
- `web/src/services/` contains the Supabase data access layer.
- `authContext.jsx` loads the current session and employee profile.
- `authService.js` handles signup, login, 2FA, verification flow, and pending employee creation.
- `profileService.js` updates account details and auth metadata.
- `employeeService.js` reads and updates employee records.
- `jobsService.js`, `emailService.js`, `notificationService.js`, `sessionService.js`, and `recommendationService.js` support the rest of the app.

### Data Model
The authoritative schema is in `DATABASE_SCHEMA.md`. Important constraints:
- `employee` has `first_name`, `last_name`, `position`, `department`, `role`, `employment_status`, and `is_archived`.
- There is no `employee_type` column in the schema.
- `job.employee_id` references `employee.employee_id`.
- `leaveform`, `notification`, `email`, and `contracts` also depend on employee IDs or user IDs.

## What Has Been Done Recently

### Job Assignment Refactor
- The Assign New Job flow now uses selected employee records instead of department selection.
- The employee dropdown is populated from `employeeService.getFieldWorkers()`.
- The recommendation button now asks for the best worker, not a department match.
- Recommendations only consider active employees with the right role, plus availability, workload, and service history.
- Job creation, notifications, and email logs now resolve the employee from the selected list item.

### Employee / Auth Flow Cleanup
- Employee creation paths were normalized to avoid invalid inserts.
- `employee_type` was removed from employee insert payloads because it is not part of the schema.
- Missing name fields now use safe defaults so inserts do not fail on `NOT NULL` constraints.
- Profile account updates now preserve existing values instead of writing nulls into required columns.

### Sidebar / Profile Fixes
- The sidebar admin check now uses `role === 'admin'`.
- The profile page continues to manage identity, presence status, API key metadata, sessions, and verification state.

## Important Behavior Notes
- The manage-employees page now only collects the fields it actually needs for registration.
- Admin/user role logic uses the `role` column, not `employee_type`.
- Field-worker filtering for assignments and recommendations is role-based and limited to active, non-archived employees.
- If a new employee row must be created without a completed profile, the code now supplies safe fallback values for required columns.

## Current Status

### Completed
- Authentication
- Email logs
- Document uploads
- Announcements
- Notifications
- Job assignment refactor to employee-based selection

### In Progress
- Session management
- Calendar integration

### Planned
- Chat system
- Analytics

## Working Rules To Remember
- Treat `DATABASE_SCHEMA.md` as authoritative.
- Do not invent columns that are not in the schema.
- Keep Supabase writes aligned with `employee`, `job`, `email`, `notification`, and `session` table constraints.
- Prefer minimal changes to the service layer when UI fields change.

## Useful Files
- `PROJECT_CONTEXT.md` for the full project overview.
- `FEATURES_STATUS.md` for a quick status snapshot.
- `KNOWN_BUGS.md` for current bugs and caveats.
- `ROUTES_AND_PERMISSIONS.md` for route access rules.
- `DATABASE_SCHEMA.md` for the schema reference.