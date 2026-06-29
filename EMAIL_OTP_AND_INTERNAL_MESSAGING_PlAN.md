# JEDDSpace Technical Implementation Guide

## Features

1. Email OTP Authentication
2. Internal Messaging System (Canvas Style)

---

# PART 1 — EMAIL OTP AUTHENTICATION

## Objective

Replace the current verification flow where the code is displayed on the website.

Current:

Email + Password
↓
Generate Code
↓
Display Code On Website
↓
Verify
↓
Dashboard

Target:

Email + Password
↓
Credentials Valid
↓
OTP Sent To Email
↓
User Enters OTP
↓
Dashboard

---

# Step 1 — Audit Current Authentication

Locate:

* authContext.js
* login page
* verify-2fa page
* alertService.verificationCode()

Identify:

* where OTP is generated
* where OTP is displayed
* where OTP is verified

Document all affected files.

---

# Step 2 — Remove Website OTP Display

Remove:

alertService.verificationCode(...)

Remove:

* popup showing verification code
* toast showing verification code
* console logging OTP

The code must never be visible inside the application.

---

# Step 3 — Configure Supabase Email Delivery

Supabase Dashboard

Authentication
→ Providers
→ Email

Enable email provider.

Authentication
→ URL Configuration

Add:

Development:
http://localhost:5173

Production:
deployment URL

---

# Step 4 — Decide OTP Strategy

Recommended:

Keep:

Email + Password

Add:

Email OTP

This creates true two-factor authentication.

Authentication Factors:

Factor 1:
Password

Factor 2:
Email OTP

---

# Step 5 — Update Login Flow

Current:

signInWithPassword()
↓
Dashboard

New:

signInWithPassword()
↓
Generate OTP
↓
Send OTP
↓
Store Pending Verification State
↓
Redirect To Verify OTP

---

# Step 6 — Create Pending Verification State

Store:

* user id
* email
* expiration timestamp

Use:

sessionStorage

Never use localStorage.

Reason:

Session should disappear after browser closes.

---

# Step 7 — Update Verify OTP Page

Verify Page Responsibilities:

* accept OTP
* validate OTP
* allow resend
* redirect on success

Add:

Resend OTP Button

Add:

Countdown Timer

Example:

Resend available in 60 seconds

---

# Step 8 — Final Session Creation

Only create authenticated application session after:

OTP Valid

If OTP invalid:

Remain on verification page.

---

# Step 9 — Testing

Test:

✓ Correct OTP

✓ Incorrect OTP

✓ Expired OTP

✓ Resend OTP

✓ Refresh Page

✓ Session Timeout

---

# PART 2 — INTERNAL MESSAGING SYSTEM

## Objective

Transform Email Logs into a Canvas-style internal messaging system.

---

# Step 1 — Audit Existing Email Module

Review:

EmailsPage.jsx

emailService.js

notificationService.js

Current database schema.

Identify:

* localStorage fallbacks
* mock data
* unsupported fields

---

# Step 2 — Remove localStorage

Delete:

LOCAL_EMAILS_KEY

getLocalEmails()

saveLocalEmails()

All messages must be stored in Supabase.

---

# Step 3 — Employee Directory Retrieval

Problem:

Emails only exist in auth.users.

Employee table contains:

user_id

auth_user_id

No email column.

---

# Step 4 — Create Employee Directory RPC

Create:

get_employee_directory()

Returns:

employee_id

full_name

email

This will populate recipient selections.

---

# Step 5 — Update employeeService

Add:

getDirectory()

Purpose:

Retrieve available messaging recipients.

---

# Step 6 — Replace Recipient Text Input

Current:

Recipient:
[text field]

New:

Recipient:
[dropdown]

User must select employee.

Prevent manual email entry.

---

# Step 7 — Implement Inbox

Messages where:

recipient_email === currentUser.email

---

# Step 8 — Implement Sent

Messages where:

sender_id === currentUser.id

---

# Step 9 — Implement Unread

Messages where:

recipient_email === currentUser.email

AND

is_read === false

---

# Step 10 — Message Viewer

When user clicks message:

Display:

From

To

Subject

Date

Message Body

---

# Step 11 — Mark As Read

When opening message:

Update:

is_read = true

---

# Step 12 — Notification Integration

When message sent:

Create notification.

Notification fields:

notify_to

created_by

link_id

Notification should open message.

---

# Step 13 — Compose Message

Flow:

Select Recipient
↓
Subject
↓
Body
↓
Send
↓
Insert Email Record
↓
Insert Notification
↓
Refresh Inbox

---

# Step 14 — Testing

✓ Send Message

✓ Receive Message

✓ Notification Appears

✓ Message Opens

✓ Read Status Updates

✓ Inbox Filter

✓ Sent Filter

✓ Unread Filter

✓ Admin To Employee

✓ Employee To Admin

---

# Future Enhancements

Phase 2:

* Realtime Updates
* Reply Feature
* Conversation Threads
* Attachments

Phase 3:

* Full Chat Module
* Presence Status
* Typing Indicators
