# JEDDSpace Master Project Context

## Project Overview

JEDDSpace is a Human Resource Management System (HRMS) and Document Management System being developed as a Capstone Project.

The system provides:

* Employee Management
* Document Management
* Leave Management
* Official Business Management
* Announcement Distribution
* Internal Notifications
* Session Management
* AI-Assisted Document Intelligence
* Blockchain-based Audit and Integrity Verification

---

# Technology Stack

## Web Application

* React (Vite)
* React Router
* Supabase
* FullCalendar
* SweetAlert2
* Vercel Hosting
* Supabase Realtime

### Planned

* Ollama
* Groq API
* Ethers.js
* Polygon Amoy Testnet

---

## Mobile Application

* React Native
* Expo
* Supabase Backend

### Planned

* Ollama Integration
* Blockchain Verification Features
* APK Distribution

---

# Deployment

## Web

Hosted on:

* Vercel

Backend:

* Supabase Authentication
* Supabase Database
* Supabase Realtime

Important deployment configuration:

vercel.json

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Reason:

React Router uses client-side routing.

Without rewrites:

* Refreshing pages causes:

  * 404 NOT_FOUND
  * Vercel route failures

---

## Environment Variables

Required:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Must:

* Have no spaces around "="
* Start with VITE_
* Be configured in Vercel

Example:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

---

## Mobile

Current:

* Expo Development Build

Defense Plan:

* Generate APK
* Provide APK directly to panel/professor

No requirement for same Wi-Fi network.

---

# Current Progress

Estimated Completion:

## Documentation

90%

## Web Application

85–90%

## Mobile Application

70–80%

---

# Completed Web Modules

## Authentication Module

Completed:

* Login
* Signup
* Two-Factor Authentication
* Logout
* Session Tracking
* Role-Based Access Control

Security Components:

* ProtectedRoute
* AdminRoute

Backend:

* Supabase Auth

---

## Dashboard Module

Completed:

### Email Summary Widget

Displays:

* Total Emails
* Latest Email

### File Upload Widget

Displays:

* Uploaded Files Count
* Latest Upload

### Calendar Widget

Implemented using:

* FullCalendar

Pulls events from:

* Announcements
* Leave Forms
* Official Business Forms
* Job Assignments
* Contracts

---

## Employee Management Module

Completed:

* Employee Listing
* Employee Records
* Employee Administration

Adviser Feedback:

Registration should move to administration.

Target:

Admin creates employee accounts.

---

## Document Management Module

Completed:

* Upload Documents
* Download Documents
* View Documents
* Document Tracking

Planned AI Integration:

* Summarization
* Semantic Search
* Analysis

Planned Blockchain Integration:

* Hash Verification
* Audit Trail

---

## Announcements Module

Completed:

* Post Announcement
* View Announcement
* Notification Triggering

---

## Forms Module

### Leave Form

Completed:

* Submission
* Approval Workflow

### Official Business Form

Completed:

* Submission
* Approval Workflow

Need additional client requirements.

---

## Notification System

Completed:

### Bell Notifications

* Realtime

### Desktop Notifications

Uses:

* Browser Notification API

Backend:

* Supabase Realtime

Notification Schema:

Uses:

* notifications_id
* created_by
* notify_to
* link_id

Does NOT use:

* user_id
* notification_id
* message column

---

# Session Management

Current Architecture:

Database-Driven Sessions

Table:

```sql
user_sessions
```

Stores:

* session_id
* user_id
* device_name
* ip_address
* created_at
* last_active
* is_current

Features:

* View Active Devices
* Revoke Device
* Logout Current Device
* Logout All Devices

Current limitation:

* Not connected to actual Supabase auth sessions.

Future improvement:

* Use Supabase Auth Admin API for true multi-device tracking.

---

# Planned Messaging System

Target:

Internal Employee Chat System

Possible Architecture:

```text
chat_rooms
messages
message_reads
```

Features:

* Direct Messages
* Team Chats
* Realtime Updates
* Read Receipts
* Notification Integration

Backend:

* Supabase Realtime

---

# Planned AI Module

## Development Environment

Ollama

Model:

* Llama 3

Workflow:

Frontend
↓
Local API Bridge
↓
Ollama

---

## Production Environment

Groq API

Workflow:

Frontend
↓
Backend API
↓
Groq

Reason:

* Faster
* Easier deployment
* No local model hosting

---

## AI Features

### Document Intelligence

* Summarization
* Content Analysis
* Information Extraction

### Semantic Search

Search documents using meaning instead of keywords.

### AI Assistant

Can answer:

* HR questions
* Document-related questions
* Internal company information

---

# Planned Blockchain Module

## Technology

* Ethers.js
* Polygon Amoy Testnet

Purpose:

Blockchain acts as:

* Immutable Audit Trail
* Document Integrity Verification Layer

Not:

* Document Storage

---

## Blockchain Workflow

Document Upload
↓
Generate SHA256 Hash
↓
Store Hash on Blockchain
↓
Receive Transaction Receipt
↓
Store Receipt in Database
↓
Verify Integrity Later

---

## Blockchain Features

### Audit Dashboard

* View Ledger
* View Receipts
* View Transactions

### Integrity Verification

Compare:

Current File Hash
vs
Blockchain Hash

Results:

* Verified
* Tampered

### Tamper Detection

If hashes differ:

Display warning.

---

# Adviser Feedback

## UI/UX

Need:

* Sidebar icon redesign
* Improved sidebar visuals

---

## User Management

Registration should be moved to Administration.

Target Flow:

Admin
↓
Creates Employee
↓
Employee Receives Credentials

---

## Leave Forms

Need Client Interview

Topics:

* Approval Workflow
* Salary Impact
* Leave Requirements
* Supporting Documents
* Processing Timelines
* Business Form Process

---

## User Status System

Need richer presence options:

* Available
* Busy
* Do Not Disturb
* Away
* Custom Status

---

# Leave Form Interview Questions

1. How long does leave approval usually take?
2. How long does business form approval usually take?
3. Will approved leave affect employee salary?
4. What types of leave exist?
5. How far in advance should employees submit leave requests?
6. Are supporting documents required?
7. Are image attachments mandatory?
8. Who approves leave requests?
9. What happens when a leave request is rejected?
10. How are substitute employees assigned?
11. Are part-time employees handled differently?
12. Is there a maximum leave duration?
13. Are emergency leaves treated differently?

---

# Capstone Remaining Work

## Web

### AI Module

* Ollama Setup
* Local API Bridge
* Prompt Reliability Testing
* Semantic Search

### Blockchain Module

* Audit Dashboard
* Hash Verification
* Blockchain Transactions
* Tamper Detection

### Messaging System

* Direct Messaging
* Realtime Chat

---

## Mobile

### Document & Intelligence Module

* Upload PDFs
* Search Documents
* Sort Documents
* AI Assistant

### Blockchain Module

* View Ledger
* Verify Hashes
* View Receipts

### User Profile Module

* Profile Editing
* Password Changes
* Notification Settings

---

# Development Notes

Important Lessons Learned:

### Vercel

Always configure:

```json
rewrites
```

for React Router.

---

### Supabase

Never hardcode:

* URL
* Anon Key

Use environment variables.

---

### FullCalendar

Requires:

```javascript
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
```

---

### Notifications

Realtime requires:

```sql
ALTER PUBLICATION supabase_realtime
ADD TABLE notification;
```

---

### Browser Errors

The recurring:

```text
Cannot read properties of undefined (reading 'toLowerCase')
```

was traced to a browser extension (Opera) and not the application itself.

---

# Documentation Style Rules

All future capstone drafts must maintain:

Human-authentic, professor-safe writing.

Avoid:

* AI-sounding wording
* Overly polished phrasing
* Excessively symmetrical sentence structure

Preferred:

* Natural student writing
* Realistic explanations
* Professional but human tone

---

# Development Philosophy

Prioritize:

1. Features required by Chapter 3
2. Defense readiness
3. Practical implementations
4. Stable deployment

Avoid:

* Overengineering
* Unnecessary microservices
* Complex blockchain architectures beyond Chapter 3 requirements

Goal:

Build only what is necessary to satisfy the capstone requirements and demonstrate a functional, defensible system.
