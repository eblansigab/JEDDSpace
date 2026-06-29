# JEDDSpace — ChatGPT Context Brief

> **Purpose:** A single, consolidated reference document so ChatGPT (or any AI assistant) can quickly understand the current state of the JEDDSpace project and provide accurate, on-brand help.
>
> **Last Updated:** June 25, 2026
> **Project Version:** w1.5.4
> **Repo:** https://github.com/eblansigab/JEDDSpace.git
> **Latest Commit:** `16f9e1b2f923035456bcf87276d5f168790b485b`

---

## 1. Project Identity

**JEDDSpace** is a **Human Resource Management System (HRMS) + Document Management System** being developed as a **Capstone Project**.

### Core Modules
- Employee Management
- Document Management
- Leave Management
- Official Business Management
- Announcement Distribution
- Internal Notifications (in-app bell + desktop push)
- Session / Device Management
- Calendar Integration (FullCalendar)
- Email Verification / Email Ownership Validation
- Email OTP Authentication
- Internal Chat / Messaging
- Planned: AI Document Intelligence
- Planned: Blockchain Audit & Integrity Verification

### Platforms
| Platform | Stack | Status |
|----------|-------|--------|
| **Web** | React (Vite) + Supabase + FullCalendar + SweetAlert2 | ~85–90% complete |
| **Mobile** | React Native + Expo + Supabase | ~70–80% complete (defense uses APK) |

### Deployment
- **Web:** Vercel (with `rewrites` config for React Router client-side routing — see §10)
- **Backend:** Supabase (Auth + Postgres + Realtime + Storage)
- **Mobile:** Expo dev build / APK handed to panel

---

## 2. Tech Stack & Dependencies

### Root `package.json`
- `sweetalert2 ^11.26.25`

### `web/package.json` (key entries)
**dependencies:**
- `@fullcalendar/daygrid ^6.1.20`
- `@fullcalendar/interaction ^6.1.20`
- `@fullcalendar/react ^6.1.20`
- `@supabase/supabase-js ^2.105.4`
- `react ^19.2.6`
- `react-dom ^19.2.6`
- `react-router-dom ^7.15.0`
- `sweetalert2 ^11.26.25`
- `ua-parser-js ^2.0.10`

**devDependencies:**
- `vite ^8.0.12`
- `@vitejs/plugin-react ^6.0.1`
- `eslint ^10.3.0` + `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

> **Note:** The `web/package.json` `name` field is still `"mobile"` (legacy) — not a bug, just a leftover. Don't rename without good reason.

---

## 3. Folder Structure

```
JEDDSpace w1.5.4/
├── AI_INSTRUCTIONS.md           # Long-running AI guidance rules + approved-change log
├── CHATGPT_CONTEXT.md           # ← this file
├── DATABASE_SCHEMA.md           # Authoritative schema (reference only — NEVER invent columns)
├── DEVELOPMENT_RULES.md         # Hard development rules
├── FEATURES_STATUS.md           # Quick status checklist (Completed / In Progress / Planned)
├── KNOWN_BUGS.md                # Known bugs list
├── PROJECT_CONTEXT.md           # Master project context (most detailed existing doc)
├── ROUTES_AND_PERMISSIONS.md    # Route → role mapping
├── SUPABASE_SETUP.md            # (empty file currently)
├── package.json                 # Root (only sweetalert2)
├── web/                         # React (Vite) web app
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── vercel.json              # SPA rewrite config
│   ├── .gitignore
│   ├── public/
│   ├── supabase/
│   │   └── supabaseClient.js
│   └── src/
│       ├── main.jsx             # React entry + theme bootstrap
│       ├── App.jsx              # <AuthProvider> wraps <AppRoutes>
│       ├── assets/              # Logo, hero, react/vite SVGs
│       ├── components/          # Reusable UI (see §6)
│       ├── constants/formOptions.js
│       ├── layouts/dashboardLayout.jsx
│       ├── pages/               # Route components (see §5)
│       ├── routes/AppRoutes.jsx
│       ├── services/            # Supabase data layer + Auth context (see §7)
│       ├── styles/style.css
│       ├── supabase/supabaseClient.js
│       └── utils/alertService.js
└── (mobile app lives elsewhere in monorepo — not in this snapshot)
```

---

## 4. Environment & Configuration

### Required env vars
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Rules: no spaces around `=`, must start with `VITE_`, configured in Vercel.

### `web/src/supabase/supabaseClient.js` (current)
Two clients are exported, but both currently reuse the same Supabase client instance:
- **`supabaseClient`** — normal session client, `persistSession: true`, `autoRefreshToken: true`, with a custom `lock` workaround for stale Web Locks on localhost.
- **`signupClient`** — exported for signup flows, but currently points to `supabaseClient`.

The file currently has **hardcoded fallback values** for URL + anon key. This violates the "no hardcoded credentials" rule but is in place so local dev still runs without a `.env`. **Production deployment must use Vercel env vars.**

---

## 5. Routes (`web/src/routes/AppRoutes.jsx`)

All pages are `React.lazy` loaded. A `LoadingOverlay` is shown briefly on route change (~400ms).

| Path | Component | Access |
|------|-----------|--------|
| `/` | `LoginPage` | Public |
| `/auth/callback` | `AuthCallbackPage` | Public / Supabase email verification callback |
| `/signup` | `SignupPage` | Admin only (via `AdminRoute` inside `ProtectedRoute`) |
| `/verify-2fa` | `Verify2FAPage` | Authenticated mid-flow |
| `/verify-otp` | Planned replacement for `/verify-2fa` | Authenticated mid-flow after password login |
| `/dashboard` | `CommonDashboardPage` | Employee / HR / Admin |
| `/admin-dashboard` | `AdminDashboardPage` | Admin only |
| `/employees` | `EmployeesPage` | Authenticated |
| `/announcements` | `AnnouncementsPage` | Authenticated |
| `/emails` | `EmailsPage` | Authenticated |
| `/documents` | `DocumentsPage` | Authenticated |
| `/profile` | `ProfilePage` | Authenticated |
| `/contracts` | `ContractsPage` | Authenticated |
| `/official-business` | `OfficialBusinessFormPage` | Authenticated |
| `/post-announcements` | `PostAnnouncementsPage` | Admin only |
| `/manage-employees` | `ManageEmployeesPage` | Authenticated (admin-gated in UI) |
| `/assign-jobs` | `AssignJobsPage` | Authenticated |
| `/audit-blockchain` | `AuditBlockchainPage` | Authenticated |
| `/leave-form` | `LeaveFormPage` | Authenticated |

Route guards:
- `ProtectedRoute` → checks `useAuth().user`, redirects to `/` if not logged in.
- `AdminRoute` → checks `employee.role === 'admin'`.

---

## 6. Key Components (`web/src/components/`)

| Component | Purpose |
|-----------|---------|
| `sideBar.jsx` | Main nav. Has profile card with **status select** (Available / Busy / Do Not Disturb / Away), HR Forms dropdown, admin-only links. Mobile slide-in via `mobile-sidebar-open` body class. Tooltips via `title=""`. |
| `DashboardCalendar.jsx` | Thin wrapper around `<FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" height="auto" />`. Takes `events` prop. |
| `ProtectedRoute.jsx` | Auth gate; `<div>Loading...</div>` while `useAuth().loading`. |
| `AdminRoute.jsx` | Role gate (admin). |
| `NotificationBell.jsx` | Realtime bell badge. |
| `Modal.jsx` | Reusable modal. |
| `LoadingOverlay.jsx` | Full-screen loading spinner. |
| `PageHeader.jsx` | Page title row. |
| `SearchBar.jsx` | Search input. |
| `StatusBadge.jsx` | Status pill. |
| `Table.jsx` | Generic data table. |
| `Button.jsx` | Reusable button (use **explicit `title=""` prop** — do NOT auto-extract from children; see AI_INSTRUCTIONS review). |
| `index.js` | Barrel export. |

---

## 7. Services Layer (`web/src/services/`)

### `authContext.jsx` (current)
- `<AuthProvider>` holds `{ user, profile, loading }`.
- On mount: calls `supabase.auth.getSession()`, then fetches `employee` row via `.eq('user_id', currentUser.id).maybeSingle()`.
- Subscribes to `supabase.auth.onAuthStateChange`.
- Sets `loading=true` only on the **initial** load.
- Current email verification state is derived directly from `user.email_confirmed_at` in route/auth checks, but `isEmailVerified` is **not yet exposed** in `AuthContext`.

### `authService.js`
- `registerUser(...)` — Supabase signup with `emailRedirectTo: ${window.location.origin}/auth/callback`.
- `loginUser(email, password)` — Supabase sign-in and blocks login when `user.email_confirmed_at` is missing.
- `beginTwoFactorSignIn(email, password)` — pre-2FA step that currently returns a browser-displayed verification code.
- `isTwoFactorEnabled` flag.
- Current 2FA code is generated client-side and shown through `alertService.verificationCode()`. This is planned to be replaced with server-sent email OTP.

### `authCallbackPage.jsx`
- Handles `/auth/callback`.
- Checks `getSession()`.
- Blocks unverified users.
- Creates the `employee` record after successful email verification when pending employee data exists.
- Redirects to login after successful verification.

### `sessionService.js` (see KNOWN_BUGS.md)
- Uses `user_sessions` table + `localStorage('jeddspace_current_session_id')` to track current session.
- `createSession(userId)` → inserts row with `device_name` (UAParser), `ip_address = 'Unknown'` (hardcoded — see bugs), `is_current = true`.
- `getActiveSessions(userId)` → returns rows with derived `is_current` from localStorage and `last_active_display` as relative time.
- `revokeSession(sessionId)` / `revokeAllSessions(userId)` → DB delete.
- `getIpAddress()` calls `https://api.ipify.org?format=json` with 2s timeout; falls back to `'112.198.115.6'` (hardcoded — bug).

### Other services
- `announcementService.js`, `documentService.js`, `emailService.js`, `employeeService.js`, `jobsService.js`, `notificationService.js`, `profileService.js`, `pushNotificationService.js`.

### `utils/alertService.js`
- Thin SweetAlert2 wrapper: `alertService.error(msg, title)`, `alertService.verificationCode(code)`, etc.

---

## 8. Database Schema (from `DATABASE_SCHEMA.md` — authoritative)

> ⚠️ **Schema is for context only — NEVER invent columns. Only use columns that exist here.**

### `employee`
- `employee_id` (int, PK)
- `first_name`, `last_name`, `position`, `department` (varchar)
- `status` (USER-DEFINED, default `'active'`)
- `auth_user_id`, `user_id` (uuid, FK → `auth.users`)
- `role` (varchar, default `'employee'`)
- `is_archived` (bool)
- `employment_status` (varchar default `'active'`)
- `date_hired`, `date_resigned`, `date_terminated`, `date_rehired` (timestamps)
- `created_at`

### `announcement`
- `announcement_id` (int, PK), `title`, `body`, `status` (USER-DEFINED, default `'unpublished'`)
- `user_id` (uuid, FK → `employee.user_id`), `created_at`

### `job`
- `job_id` (PK), `employee_id` (FK → `employee`)
- `department`, `destination`, `start_date`, `end_date`, `notes`
- `status` (USER-DEFINED default `'open'`)
- `created_by` (FK → `employee.user_id`), `created_at`

### `leaveform`
- `leaveform_id` (PK), `employee_id` (FK), `start_date`, `end_date`
- `type` (USER-DEFINED), `reason`, `status` (default `'pending'`)
- `created_by`, `created_at`, `isCredited` (bool)

### `businessform`
- `businessform_id` (PK), `employee_id`, `project_id`
- `start_date`, `end_date`, `location`, `company_car`, `driver_name`, `phone_num`
- `created_by`, `created_at`

### `document`
- `document_id` (PK), `title`, `file_path`, `file_size`, `file_type`, `file_name`
- `uploaded_by` (FK → `employee.user_id`), `upload_id` (FK → `storage.objects`)
- `created_at`

### `email`
- `email_id` (PK), `sender_id`, `recipient_email`, `subject`, `message_body`
- `folder` (USER-DEFINED default `'inbox'`), `is_read`, `attachment_url`, `created_at`

### `contracts`
- `contracts_id` (PK), `job_id` (FK), `contract_url`, `contract_file_url`
- `start_date`, `end_date`, `salary`, `contract_title`, `status` (default `'pending_signature'`)
- `contractor` (FK → `employee.employee_id`), `contract_document` (FK → `document.document_id`)

### `notification` ⚠️ uses unusual column names
- `notifications_id` (PK, not `notification_id`)
- `title`, `type` (USER-DEFINED), `is_read`
- `link_id` (int), `notify_to` (int, FK → `employee.employee_id`)
- `created_by` (uuid, FK → `employee.user_id`)
- `priority` (varchar default `'Normal'`), `message` (text), `created_at`

### `audit_logs` (planned blockchain)
- `audit_id` (PK), `table_name`, `record_id`, `blockchain_hash`, `transaction_hash`, `created_at`

### `ai_summarization` (planned)
- `summary_id` (PK), `reference_type`, `content_summary`, `raw_data_snapshot`, `created_at`

### `user_sessions`
- `session_id` (uuid, PK), `user_id` (uuid), `device_name`, `ip_address`
- `created_at`, `last_active`, `is_current`

### `leavecredits`
- `creditid` (bigint, PK), `uuid` (FK → `auth.users`), `credits` (bigint)

### `test`
- `id`, `name`, `created_at` — appears to be a leftover test table; safe to ignore.

---

## 9. Features Status (from `FEATURES_STATUS.md` + `PROJECT_CONTEXT.md`)

### ✅ Completed
- Authentication (Login, Signup, 2FA, Logout, Session Tracking, RBAC)
- Partial Supabase email verification:
  - signup uses `emailRedirectTo` for `/auth/callback`
  - login blocks unverified users with `email_confirmed_at`
  - `/auth/callback` verifies email and creates employee record when needed
  - `ProtectedRoute` blocks unverified users
- Email Logs / basic internal message viewer using existing `email` table
- Document Uploads (upload / download / view / track)
- Announcements (post + view + notification trigger)
- Notifications (realtime bell + browser desktop notifications)

### 🟡 In Progress
- Session Management (DB-driven but still uses localStorage for "current" pointer; `user_sessions` not yet tied to real Supabase auth tokens)
- Calendar Integration (FullCalendar widget working, mobile responsiveness needs polish)
- Email Verification Cleanup:
  - add `resendVerificationEmail`
  - expose `isEmailVerified` from `AuthContext`
  - fix signup redirect after registration
  - add email verification status/resend UI to Profile page
  - add sidebar verification warning
- Real-world email existence validation:
  - recommended options are Microsoft 365 Graph API validation or Supabase pre-approved email table
  - this must happen during signup, not only on Profile page

### ⚪ Planned
- Email OTP Authentication:
  - replace browser-displayed 2FA code with server-sent email OTP
  - add `otp_challenges` table
  - add Supabase Edge Functions for send/verify OTP
  - add `/verify-otp` page
  - remove `alertService.verificationCode()` usage for login OTP
- Proper Internal Messaging System:
  - replace/augment existing `email` table with thread and recipient model
  - add `message_threads`
  - add `internal_messages`
  - add `message_recipients`
  - optional `message_attachments`
  - support inbox, unread, sent, replies, broadcast, soft delete, and per-user access
- Chat System (direct messages, team chats, realtime, read receipts)
- Analytics

### Page-by-page completion (web)
| Module | Status |
|--------|--------|
| Authentication | ✅ core complete; email verification cleanup in progress; email OTP planned |
| Dashboard (Email/File widgets + Calendar) | ✅ |
| Employee Management | ✅ (but admin-only registration pending full cutover) |
| Document Management | ✅ core, AI/blockchain pending |
| Announcements | ✅ |
| Leave Form | ✅ core, client interview needed for details |
| Official Business Form | ✅ core |
| Contracts | ✅ |
| Notifications | ✅ |
| Session Management | 🟡 |
| Email Verification UI | 🟡 planned/in progress |
| Email OTP | ⚪ planned |
| Internal Messaging | 🟡 basic viewer exists; proper Canvas-style system planned |

---

## 10. Critical Configuration & Gotchas

### Vercel rewrite (mandatory)
`web/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Without this, refreshing any client-side route → 404 on Vercel.

### Supabase Auth email confirmation
Required for email verification:
```text
Authentication
→ Providers
→ Email
→ Enable Confirm Email
```

Required redirect URL:
```text
http://localhost:5173/auth/callback
```

Production must also add the deployed domain callback URL.

### Supabase SMTP / email provider
Required before email verification or email OTP can work reliably:
```text
Project Settings
→ Auth
→ SMTP Settings
```

Use Supabase email provider, Microsoft 365 SMTP, or another approved SMTP provider. Do not rely on frontend-only email sending.

### Supabase Realtime (required for notifications)
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notification;
```

### FullCalendar
Must import both `@fullcalendar/react` and `@fullcalendar/daygrid` (already done).

### Theme bootstrap
`main.jsx` reads `localStorage.getItem('theme')` (or legacy `jeddspace_theme`) and sets `document.documentElement.dataset.theme` before render.

### Auth lock workaround
The custom `lock: async (_name, _acquireTimeout, fn) => fn()` in `supabaseClient.js` is intentional — it prevents hangs from stale Web Locks on localhost with multiple tabs. **Don't remove it.**

---

## 11. Development Rules (`DEVELOPMENT_RULES.md`)

1. **Never use mock data.**
2. **Always use Supabase.**
3. **No hardcoded users.**
4. **No hardcoded IP addresses.** ← Currently violated in `sessionService.js` (fallback `'112.198.115.6'`) and the IP isn't actually saved (saves `'Unknown'` instead).
5. **Role checks must use `employee.role`.**
6. **Protected routes required.**
7. **Mobile responsive first.**
8. **Follow existing project structure.**

---

## 12. Known Bugs (`KNOWN_BUGS.md`)

- Session management currently uses **localStorage** (`'jeddspace_current_session_id'`) — not yet tied to real Supabase auth tokens.
- Mobile responsiveness of buttons on the **verify 2FA** page needs improvement.
- **FullCalendar** mobile responsiveness needs improvement.
- **2FA verification code pops up twice** — needs investigation.
- Email verification UI is incomplete: `AuthContext` does not expose `isEmailVerified`, Profile page does not show resend verification UI, and signup redirects to `/manage-employees` after registration instead of login/pending verification.
- Current 2FA code is shown in the browser instead of being sent by email; email OTP is planned.

> Browser-side note: `Cannot read properties of undefined (reading 'toLowerCase')` was traced to an **Opera extension**, not the app.

---

## 13. Adviser Feedback & Approved UI/UX Changes

(From the review appended to `AI_INSTRUCTIONS.md`.)

### Approved (do these)
| Change | Priority | Notes |
|--------|----------|-------|
| **Admin-only registration** | High | Admin creates employees via Manage Employees → Add Employee → `registerUser()`. **Don't remove public registration until the admin-create path is fully verified.** |
| **Sidebar icon redesign** | Medium | Documents → folder-open; Contracts → agreement/doc-with-check; Announcements → megaphone; HR Forms → clipboard; Admin → shield. (Already implemented in current `sideBar.jsx`.) |
| **Desktop sidebar animations** | Medium | Keep simple (`transition: 0.3s ease;` or `transition: width 0.3s ease;`). Don't over-tune. |
| **Hover tooltips (`title=""`)** | Medium | Apply to: sidebar collapse btn, notification bell, widget controls, modal close, action buttons. Always use **explicit** `title=""` props — do NOT auto-extract from children. |

### Modified
- **`Button.jsx` automatic title extraction → USE EXPLICIT TITLES.** Auto-extraction breaks when children are icons or mixed icon+text.

### Postponed
- **Mobile sidebar animations** — stabilize mobile functionality first (login, dashboard, announcements, logout, employee creation).

### Conditional
- **Remove public registration from `loginPage.jsx`** — only safe AFTER confirming admin create-employee works end-to-end via `registerUser()` in Manage Employees. If that path doesn't fully work, public registration must stay.

### Recommended allocation
- **80% functional features** (auth, CRUD, dashboard logic, mobile test cases)
- **20% UI/UX polish** (animations, icons, tooltips)

---

## 14. AI Module Plan

| Environment | Stack |
|-------------|-------|
| **Dev** | Ollama + Llama 3 (local API bridge) |
| **Prod** | Groq API (no model hosting needed) |

**Features:** Document summarization, content analysis, semantic search, HR Q&A assistant.

**Avoid:** Agentic AI, multi-agent systems, excessive complexity.

---

## 15. Blockchain Module Plan

- **Tech:** Ethers.js + Polygon Amoy Testnet
- **Purpose:** Immutable audit trail + document integrity verification (NOT document storage)

**Workflow:** Upload doc → SHA256 hash → store hash on-chain → save receipt in `audit_logs` table → verify later.

**Features:** Audit dashboard, integrity verification (current hash vs chain hash → verified/tampered), tamper detection.

**Avoid:** Custom blockchain, mining, validators, Hyperledger.

---

## 16. Current Implementation Plan: Email Verification, Email OTP, Internal Messaging

### Current implementation status as of June 19, 2026
- Email verification is partially implemented in Supabase Auth.
- No code changes from the new email verification cleanup, pre-approved email validation, email OTP, or messaging plan have been applied yet.
- The current implementation state is still based on the existing code snapshot:
  - `authService.js` has partial email verification support through `emailRedirectTo` and `email_confirmed_at` checks.
  - `authCallbackPage.jsx` handles `/auth/callback`.
  - `ProtectedRoute.jsx` blocks unverified users.
  - `signupPage.jsx` still redirects to `/manage-employees` after registration and still needs to be changed to `/`.
  - `authContext.jsx` does not yet expose `isEmailVerified`.
  - `profilePage.jsx` does not yet show email verification status or resend verification email UI.
  - `sideBar.jsx` does not yet show an unverified email warning banner.
  - Current 2FA still shows the verification code in the browser through `alertService.verificationCode()`.
  - Existing `/emails` page is a basic internal message viewer, not yet a full Canvas-style messaging system.

### Proposed implementation order
1. **Supabase setup**
   - Enable Supabase Auth `Confirm Email`.
   - Add `http://localhost:5173/auth/callback` to redirect URLs.
   - Add production callback URL later.
   - Configure SMTP or Microsoft 365 email provider.

2. **Email verification frontend cleanup**
   - Add `resendVerificationEmail` to `authService.js`.
   - Add `isEmailVerified` to `AuthContext`.
   - Change `signupPage.jsx` redirect from `/manage-employees` to `/`.
   - Add Email Verification section to `profilePage.jsx`.
   - Add unverified email warning banner to `sideBar.jsx`.

3. **Real-world email existence validation**
   - Recommended: Microsoft 365 Graph API validation for actual tenant email accounts.
   - Simpler capstone option: Supabase `preapproved_emails` table seeded with real employee emails.
   - This check must happen during signup before `auth.signUp`, not only on Profile page.
   - Frontend-only validation is not enough.

4. **Email OTP authentication**
   - Replace browser-displayed 2FA code with server-sent email OTP.
   - Add `otp_challenges` table.
   - Add Supabase Edge Functions for sending and verifying OTP.
   - Add `/verify-otp` page.
   - Remove `alertService.verificationCode()` usage for login OTP.
   - Remove client-side `generate2FACode()` and localStorage pending 2FA flow.

5. **Internal messaging system**
   - Keep existing `/emails` behavior temporarily.
   - Add proper messaging tables:
     - `message_threads`
     - `internal_messages`
     - `message_recipients`
     - optional `message_attachments`
   - Replace direct `recipient_email` matching with recipient rows.
   - Add thread-based replies.
   - Add broadcast messages through recipient rows.
   - Add soft delete using `deleted_at`.
   - Add unread/read counts.
   - Add RLS so only sender and recipients can view messages.
   - Add Realtime for new message updates.

### Testing expectations
- Real existing company/Microsoft 365 email:
  - signup allowed
  - verification email sent
  - email verified
  - login allowed
- Fake/nonexistent email:
  - signup rejected before Supabase account creation
- Already-used email:
  - signup rejected
- Existing but unverified email:
  - login blocked until verification link is clicked
- Profile page:
  - shows current email
  - shows `Verified` or `Unverified`
  - shows resend verification email button for unverified users
- Email OTP:
  - code is sent by email, not shown in browser
  - wrong/expired code is rejected
  - successful OTP creates session and redirects to dashboard
- Internal messaging:
  - users can send, receive, reply, view unread count, soft delete, and receive broadcast messages

---

## 17. Other Useful Notes from `PROJECT_CONTEXT.md`

- `notification` table uses **`notifications_id`** (not `notification_id`), and does **NOT** have a `message` column / `user_id` column. Code must use `notify_to`, `link_id`, `created_by`.
- FullCalendar import pattern: `import FullCalendar from '@fullcalendar/react'; import dayGridPlugin from '@fullcalendar/daygrid';`
- Don't hardcode Supabase URL or anon key in production.
- The recurring `toLowerCase` undefined error was traced to an Opera browser extension, not the app.

### Leave Form Interview Questions (adviser still wants these answered)
1. Approval duration (leave + business form)
2. Salary impact of approved leave
3. Types of leave
4. Submission lead time
5. Required supporting documents / image attachments
6. Approvers per request
7. Rejection flow
8. Substitute assignment
9. Part-time handling
10. Maximum leave duration
11. Emergency leave handling

---

## 18. Quick Reference for ChatGPT

When asked to help with JEDDSpace, prefer:
1. **Editing existing files** over creating new ones.
2. **Using Supabase** for all data (no mock data, no local arrays).
3. **Following current naming** (`notifications_id`, `notify_to`, `link_id`, `employee.role`).
4. **Adding `title=""`** to buttons / icon-only controls.
5. **Lazy-loading** routes (already the pattern).
6. **SweetAlert2** for popups (via `alertService`).
7. **Explicit role checks** using `profile.role === 'admin'`.
8. **Mobile-first responsive** layouts.

### Likely "in-progress" tasks you may be asked to complete
- Tie `user_sessions` to real Supabase auth tokens (replace localStorage pointer).
- Fix the 2FA code popup-twice bug.
- Mobile responsiveness for verify-2fa buttons and FullCalendar.
- Finish email verification cleanup:
  - add `resendVerificationEmail`
  - expose `isEmailVerified`
  - fix signup redirect to `/`
  - add Profile page email verification section
  - add sidebar verification warning
- Add real-world email existence validation before signup using Microsoft 365 Graph API or a Supabase pre-approved email table.
- Replace browser-displayed 2FA with server-sent email OTP.
- Build internal chat/messaging (Supabase Realtime).
- Conditional cutover: remove `/signup` from public routes once admin-side `registerUser` is verified.

---

## 19. Current Handover Summary

### Architecture Snapshot
- Web app: React + Vite SPA in `web/`.
- State/data access: Supabase through `web/src/services/`.
- Routing: lazy-loaded pages in `web/src/routes/AppRoutes.jsx`.
- Auth/profile: `authContext.jsx`, `authService.js`, `profileService.js`.
- Role checks: `employee.role` is the active control field for permissions.
- Schema source of truth: `DATABASE_SCHEMA.md`.

### Recent Work Completed
- Refactored Assign New Job to use selected employees instead of department selection.
- Recommendations now score active employees by availability, workload, and service history.
- Removed `employee_type` usage from employee writes/filters because it is not in the schema.
- Fixed employee auto-creation and profile updates so required `employee` columns do not receive null values.
- Fixed sidebar admin detection to use `role === 'admin'`.
- Simplified Manage Employees to remove unused department/role/position form state.

### Important Constraints
- Never invent or use columns that are not in `DATABASE_SCHEMA.md`.
- Keep employee creation defensive: supply safe defaults for required fields when a profile is incomplete.
- Preserve Supabase-backed behavior and avoid mock data.
- Keep file changes minimal and focused on the existing architecture.

### Git
- Repo: `https://github.com/eblansigab/JEDDSpace.git`
- Latest commit at snapshot time: `16f9e1b2f923035456bcf87276d5f168790b485b`
- Working dir: `c:\Users\Gabrielle Ferrer\Downloads\JEDDSpace w1.5.4`

---

*End of brief. Update this file whenever schema, routes, deployment, or feature status changes.*
