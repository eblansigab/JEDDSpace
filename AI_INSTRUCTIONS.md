# AI_INSTRUCTIONS_EMAIL_OTP_AND_MESSAGING.md

## Objective

Implement:

1. Email OTP Authentication
2. Internal Messaging System

Follow existing JEDDSpace architecture.

---

# Project Rules

Mandatory:

* Supabase-first
* No mock data
* No localStorage persistence
* No hardcoded users
* Reuse existing services
* Preserve existing coding conventions
* Mobile responsive

---

# FEATURE 1 — EMAIL OTP AUTHENTICATION

## Remove

Remove:

* Website OTP display
* Verification code popups
* alertService.verificationCode()

The OTP must never be visible inside the application.

---

## Authentication Requirements

Keep:

Email + Password

Add:

Email OTP

Authentication must require:

1. Password Validation
2. OTP Validation

before dashboard access.

---

## Required Deliverables

* Updated Login Flow
* Verify OTP Page
* OTP Resend
* OTP Expiration
* Session Validation

---

## Constraints

Do not:

* Store OTP in localStorage
* Display OTP on website
* Hardcode OTP values

Use Supabase-supported email delivery.

---

# FEATURE 2 — INTERNAL MESSAGING SYSTEM

## Goal

Convert Email Logs into a Canvas-style internal messaging system.

---

## Existing Schema

Use existing email table.

Fields:

* email_id
* sender_id
* recipient_email
* subject
* message_body
* is_read
* created_at

---

## Employee Directory

Emails exist only in:

auth.users.email

Do not add email column to employee table.

Create:

get_employee_directory()

or equivalent secure retrieval mechanism.

---

## Messaging Layout

Sidebar:

* Inbox
* Sent
* Unread

Main List:

* Subject
* Sender
* Date

Viewer:

* From
* To
* Subject
* Date
* Body

---

## Compose Message

Replace free-text recipient input.

Use employee selector.

Recipient selection must come from employee directory retrieval.

---

## Sending Logic

Send Message:

1. Insert email record.
2. Create notification record.
3. Refresh inbox.

---

## Notification Integration

Reuse existing notification system.

Required fields:

* notify_to
* created_by
* link_id

Notification should open corresponding message.

---

## Read Status

Opening message must:

update is_read = true

---

## Deliverables

* Employee Directory Retrieval
* Inbox
* Sent
* Unread
* Message Viewer
* Read Status
* Notification Integration

---

## Future Compatibility

Design implementation so future upgrades can support:

* Realtime Messaging
* Message Threads
* Reply Functionality
* Internal Chat Module

without requiring major schema redesign.
