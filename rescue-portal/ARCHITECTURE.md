# Emergency Rescue Portal — Architecture, Workflow & Scope

> **Version:** 1.0  
> **Last Updated:** June 25, 2026  
> **Production URL:** https://www.rescue-portal.ph  
> **Repository:** github.com/gian101310/municipality-rescue-portal

---

## 1. Project Overview

The Emergency Rescue Portal is a multi-tenant emergency response platform built for Philippine Local Government Units (LGUs). It enables verified residents to report emergencies with GPS location, and provides municipality staff with a real-time operations dashboard for triage, dispatch, and tracking.

Each municipality tenant operates independently with its own residents, rescue units, incident queue, and geographic coverage — all served from a single codebase deployed on Vercel.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (Turbopack, App Router) |
| Language | TypeScript (strict) |
| Auth | Supabase Auth (email/password, magic link recovery) |
| Database | Supabase PostgreSQL with Row-Level Security (RLS) |
| Backend Client | `@supabase/ssr` v0.12+ (`createBrowserClient`, `createServerClient`, admin client) |
| UI Components | `@base-ui/react` ^1.6.0 (NOT Radix UI, NOT standard shadcn/ui) |
| Styling | Tailwind CSS 4 + `tw-animate-css` |
| Maps | Leaflet + React-Leaflet + OpenStreetMap/CARTO tiles |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Notifications | Sonner (toast), Telegram Bot API (dispatch alerts) |
| Mobile | Capacitor (Android APK builds via web wrapper) |
| Hosting | Vercel (auto-deploy from GitHub `main` branch) |
| Package Manager | pnpm |
| Proxy/Middleware | `src/proxy.ts` (Next.js 16 uses `proxy.ts` instead of `middleware.ts`) |

---

## 3. Role Hierarchy (Locked)

The tenant role hierarchy is fixed and cannot be modified:

```
Super Admin (Platform Owner)
  └── Municipality Tenant (Organization)
        └── Municipality Admin
              └── Dispatch Unit Staff (Dispatcher)
                    └── Team Leader
                          └── Rescue Team (Responder)

Residents ← separate from municipality personnel
```

| Role | Access Level |
|------|-------------|
| `super_admin` | Platform-wide: manage organizations, municipalities, staff, impersonate admins |
| `admin` | Organization-scoped: incidents, residents, teams, settings, reports, audit logs |
| `dispatcher` | Ops dashboard: triage incidents, assign units, track status in real-time |
| `team_leader` | Rescue team view: accept assignments, update field status |
| `responder` | Rescue team view: see assigned incidents, update on-scene status |
| `verifier` | Resident verification: review and approve/reject resident registrations |
| `staff` | Staff portal: read-only dashboard access for general municipality staff |
| `resident` | Resident app: submit SOS/emergency reports, view incident history |

All roles see the admin dashboard. Restricted actions (delete, logout, change settings, download logs) are admin-only. The admin must enter a master key (bcrypt-verified per organization) to unlock editing controls.

---

## 4. Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (landing page)            # Public landing page at /
│   ├── admin/                    # Municipality admin dashboard
│   │   ├── analytics/            # Analytics & KPI overview
│   │   ├── audit/                # Audit log viewer
│   │   ├── health/               # System health monitoring
│   │   ├── hotlines/             # Emergency hotline directory
│   │   ├── incidents/            # Incident list + detail view
│   │   │   └── [id]/             # Individual incident management
│   │   ├── map/                  # Live operations map
│   │   ├── profile/              # Admin profile + change password
│   │   ├── qr-posters/           # Generate QR code posters for residents
│   │   ├── reports/              # Reports with filters, charts, CSV/JSON export
│   │   ├── residents/            # Resident management
│   │   ├── settings/             # Organization settings
│   │   ├── teams/                # Rescue unit management
│   │   │   └── shifts/           # Shift scheduling
│   │   └── verification/         # Resident verification queue
│   ├── api/                      # API routes (Next.js Route Handlers)
│   │   ├── admin/                # Admin-scoped endpoints
│   │   │   ├── barangays/        # Barangay CRUD + import
│   │   │   ├── change-password/  # Password change
│   │   │   ├── dashboard/        # Dashboard stats
│   │   │   ├── emergency-types/  # Emergency type CRUD
│   │   │   ├── health/           # Health check
│   │   │   ├── incidents/        # Incident CRUD, status, assignments, escalation
│   │   │   ├── organization-settings/
│   │   │   ├── qr-context/       # QR code generation context
│   │   │   ├── residents/        # Resident management + status updates
│   │   │   ├── secure-logout/    # Password-confirmed logout
│   │   │   ├── teams/            # Rescue unit CRUD + members
│   │   │   └── verify-master-key/# Master key verification
│   │   ├── auth/
│   │   │   ├── register-resident/# Resident self-registration
│   │   │   └── trusted-session-refresh/ # 90-day session recovery
│   │   ├── bootstrap-owner/      # First-time super admin setup
│   │   ├── coverage-lock/        # Geographic coverage validation
│   │   ├── emergency-types/      # Public emergency type list
│   │   ├── municipality-info/    # Public municipality details
│   │   ├── resident/
│   │   │   └── incidents/        # Resident incident submission + SOS
│   │   └── super-admin/          # Super admin endpoints
│   │       ├── login-as-admin/   # Impersonate municipality admin
│   │       ├── staff/            # Staff creation
│   │       └── tenants/          # Tenant/organization management
│   ├── auth/                     # Auth pages
│   │   ├── login/                # Tabbed login (Staff/Admin + Resident)
│   │   ├── register/             # Resident registration (QR-linked)
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dispatch/                 # Dispatch operations center
│   ├── rescue-team/              # Rescue team field view
│   ├── responder/                # Responder field view
│   ├── resident/                 # Resident app
│   │   ├── emergency/            # Report emergency form
│   │   ├── history/              # Incident history
│   │   └── profile/              # Resident profile
│   ├── staff-portal/             # General staff read-only dashboard
│   ├── super-admin/              # Platform owner management
│   ├── scan/                     # QR code scanner + smart routing
│   ├── how-it-works/             # Public info page
│   ├── emergency-hotlines/       # Public hotline directory
│   └── offline/                  # Offline fallback page
│
├── components/                   # Shared React components
│   ├── ui/                       # Base UI primitives (25 components)
│   │   ├── button, card, input, label, dialog, tabs, etc.
│   │   └── dropdown-menu, select, command, popover, sheet, etc.
│   ├── map-view.tsx              # Leaflet map with incident pins
│   ├── dual-location-map.tsx     # Created vs. sent location comparison
│   ├── incident-timeline.tsx     # Full incident event timeline
│   ├── incident-status-badge.tsx # Status badge with colors
│   ├── severity-badge.tsx        # Severity level badge
│   ├── delivery-badge.tsx        # Delivery status indicator
│   ├── priority-badge.tsx        # Priority level badge
│   ├── escalation-monitor.tsx    # Escalation rule tracking
│   ├── ops-incident-filters.tsx  # Dispatch filter panel
│   ├── notification-center.tsx   # In-app notifications
│   ├── master-key-provider.tsx   # Admin unlock context
│   ├── voice-sos.tsx             # Voice-activated SOS (experimental)
│   ├── landing-sos-demo.tsx      # Landing page SOS demo widget
│   └── ...
│
├── lib/                          # Shared utilities & business logic
│   ├── supabase/
│   │   ├── client.ts             # Singleton browser client
│   │   ├── server.ts             # Server client + admin client
│   │   └── database.types.ts     # Auto-generated DB types
│   ├── types.ts                  # 48 shared TypeScript types/interfaces
│   ├── trusted-session.ts        # 90-day persistent resident login
│   ├── auth.ts                   # Auth helper utilities
│   ├── auth-validation.ts        # Role/permission validation
│   ├── incident-submission.ts    # Incident creation logic
│   ├── incident-actions.ts       # Status transition logic
│   ├── incident-assignment.ts    # Unit assignment logic
│   ├── incident-status-actions.ts# Status action helpers
│   ├── incident-presentation.ts  # Display formatting
│   ├── incident-detail-location.ts# Location processing
│   ├── live-incidents.ts         # Real-time incident queries
│   ├── use-realtime-incidents.ts # Supabase Realtime subscription hook
│   ├── severity-scoring.ts       # Auto severity calculation
│   ├── escalation-rules.ts       # Time-based escalation rules
│   ├── dashboard-live-map.ts     # Map data processing
│   ├── emergency-type-catalog.ts # Emergency type definitions
│   ├── notification-sound.ts     # Audio alert management
│   ├── offline-sos-queue.ts      # Offline SOS queuing
│   ├── registration-context.ts   # Multi-step registration state
│   ├── registration-organization.ts # Org-linked registration
│   ├── resident-import.ts        # Bulk resident import
│   ├── rescue-team-payload.ts    # Team data serialization
│   ├── team-members.ts           # Team member management
│   ├── tenant-admin.ts           # Tenant administration
│   ├── coverage-lock-client.ts   # Geographic lock enforcement
│   ├── master-key.ts             # Master key verification
│   ├── sanitize.ts               # XSS-safe input sanitization
│   ├── rate-limiter.ts           # Client-side rate limiting
│   ├── server-rate-limiter.ts    # Server-side rate limiting
│   ├── settings-context.tsx      # Settings React context
│   ├── i18n-context.tsx          # Internationalization context
│   ├── lgu-directory.ts          # LGU municipality registry
│   ├── philippines-geography.ts  # PH geography data (PSGC)
│   ├── hotline-data.ts           # Emergency hotline directory
│   ├── timeline-helpers.ts       # Timeline event formatting
│   ├── owner-test-mode.ts        # Super admin test mode
│   └── demo-data.ts              # Demo/seed data
│
├── hooks/
│   └── use-offline-sos.ts        # Offline SOS detection hook
│
└── proxy.ts                      # Request proxy (replaces middleware.ts)
```

---

## 5. Database Schema

The Supabase PostgreSQL database has **27 tables** with Row-Level Security (RLS) enabled on all tables. Key tables:

### Core Entity Tables

| Table | Purpose | Rows (current) |
|-------|---------|:--------------:|
| `organizations` | Municipality tenants — name, slug, region, province, hotlines, map center, branding, subscription tier, master key hash | 4 |
| `municipalities` | Geographic subdivisions within an organization | 4 |
| `barangays` | Barangay-level subdivisions with captain info and polygon coordinates | 0 |
| `user_profiles` | Staff/resident profiles — role, organization, municipality, registration status, ID verification, emergency contacts | 26 |
| `profiles` | Legacy auth-linked profile (Supabase trigger-created) | 2 |
| `rescue_units` | Rescue teams — name, code, leader, status, vehicle info, equipment, specializations, GPS location, Telegram chat ID | 16 |
| `rescue_unit_members` | Team membership (leader/member role) | 0 |

### Incident Management Tables

| Table | Purpose | Rows |
|-------|---------|:----:|
| `incidents` | Core incident records — reference number, reporter, emergency type, severity, status, GPS coordinates, triage flags, delivery tracking, offline sync metadata | 28 |
| `incident_locations` | GPS location snapshots (accuracy, altitude, heading, speed, source) | 27 |
| `incident_assignments` | Unit assignment records with accept/decline tracking | 4 |
| `incident_status_history` | Full status transition audit trail | 87 |
| `incident_timeline` | Rich event timeline (status changes, notes, system events) | 0 |
| `incident_notes` | Internal/external notes per incident | 0 |
| `incident_attachments` | File attachments (photos, documents) | 0 |
| `triage_answers` | Structured triage questionnaire responses | 0 |
| `false_alert_reviews` | False alert review decisions (confirmed_false/confirmed_real/inconclusive) | 0 |
| `emergency_types` | Configurable emergency categories per organization | 17 |

### Operational Tables

| Table | Purpose | Rows |
|-------|---------|:----:|
| `notifications` | In-app notification queue with priority and read status | 0 |
| `telegram_delivery_logs` | Telegram message delivery tracking with retry | 0 |
| `audit_logs` | System-wide audit trail (CRUD, login/logout, assignments, exports) | 0 |
| `system_settings` | Per-organization key-value configuration | 0 |
| `device_sessions` | Device session tracking (web/iOS/Android) | 0 |
| `shift_schedules` | Team shift scheduling (day/swing/night) | 0 |
| `resident_verifications` | Verification workflow records | 9 |
| `organization_geo_scopes` | Geographic coverage locks (PSGC-based) | 4 |
| `trusted_sessions` | 90-day persistent resident login tokens | 1 |
| `tenants` | Legacy tenant model (being superseded by organizations) | 0 |

### Key Enums (Postgres)

- `user_role`: resident, super_admin, admin, dispatcher, team_leader, responder, verifier, staff
- `incident_status`: 24 states from `submitted` through `closed` (including `false_alert`, `cancelled`, `transferred`)
- `incident_severity`: critical, high, medium, low
- `team_status`: available, assigned, preparing, dispatched, on_scene, returning, off_duty, unavailable
- `registration_status`: draft, submitted, under_review, more_info_required, approved, rejected, suspended
- `assignment_status`: assigned, accepted, declined, cancelled, completed
- `notification_type`: incident_new, incident_update, incident_assigned, incident_resolved, unit_status_change, registration_update, system, alert
- `audit_action`: create, update, delete, login, logout, assign, unassign, status_change, approve, reject, verify, export, view
- `geography_scope_level`: country, region, province, municipality
- `id_type`: 12 Philippine ID types (national_id, drivers_license, passport, philhealth, etc.)

---

## 6. Authentication & Session Management

### Standard Login Flow

1. User submits email + password on `/auth/login`
2. `supabase.auth.signInWithPassword()` authenticates
3. Server checks `user_profiles` for role, active status, and approval
4. Routes to role-appropriate dashboard (`/admin`, `/resident`, `/dispatch`, `/rescue-team`, `/staff-portal`, `/super-admin`)

### Resident Trusted Session (90-Day Persistent Login)

Residents can opt into "Trust this device" for persistent login without re-entering credentials:

1. **Login** → `createTrustedSession()` generates a `crypto.randomUUID()` token, inserts into `trusted_sessions` table, stores in `localStorage` + sets `rp_ts=1` cookie flag
2. **Return visit (session valid)** → Normal Supabase session cookie works
3. **Return visit (session expired)** → `proxy.ts` sees `rp_ts=1` cookie on `/resident/*` routes → lets page load → `resident/layout.tsx` calls `/api/auth/trusted-session-refresh` with stored token → server validates token, checks user is approved resident, generates magic link → client calls `verifyOtp({ token_hash, type: 'magiclink' })` → session restored
4. **Sliding window** → Each validated visit extends expiry by 90 days
5. **Revocation** → Logout, cache clear, admin revoke, or 90-day expiry clears the session

### Admin Secure Logout

Admin logout requires password confirmation via `/api/admin/secure-logout` to prevent unauthorized logouts of shared dispatch stations.

### Master Key

Each organization has a `master_key_hash` (bcrypt). Admins must enter the master key to unlock destructive operations (delete incidents, edit reports, change settings). The master key state is managed via `MasterKeyProvider` context.

---

## 7. Request Proxy (`proxy.ts`)

Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The proxy handles:

1. **Session refresh** — Creates a Supabase server client to refresh auth cookies on every request
2. **Route protection** — Redirects unauthenticated users from protected routes (`/admin/*`, `/resident/*`, `/dispatch/*`, etc.) to `/auth/login`
3. **Trusted session bypass** — Allows `/resident/*` routes through when `rp_ts=1` cookie exists (enables client-side session recovery)
4. **Authenticated redirect** — Redirects logged-in users away from `/auth/login` and `/auth/register` to their dashboard

---

## 8. Core Workflows

### 8.1 Resident Registration Flow

```
Scan QR Code (municipality-specific URL)
  → /auth/register?org=<slug>&municipality=<id>
  → Fill registration form:
      - Personal info (name, email, phone, DOB)
      - Address (barangay, municipality, province)
      - Government ID (type, number, front/back photo upload)
      - Emergency contact details
  → POST /api/auth/register-resident
  → Supabase auth.admin.createUser() + user_profiles insert
  → registration_status = 'submitted'
  → Admin receives notification
  → Admin reviews in /admin/verification
  → Approve → registration_status = 'approved' → resident can log in
  → Reject → registration_status = 'rejected' with reason
```

### 8.2 Emergency Reporting Flow (Resident)

```
Resident Dashboard (/resident)
  → Choose: "I AM INVOLVED" or "REPORTING FOR SOMEONE ELSE"
  → /resident/emergency?role=victim|passerby
  → Select emergency type (fire, flood, medical, etc.)
  → Answer triage questions (affected count, hazards, unconscious, fire, flooding, violence)
  → Add description
  → GPS capture (browser geolocation API)
  → 3-second SOS hold-to-confirm (prevents accidental submissions)
  → POST /api/resident/incidents or /api/resident/incidents/sos
  → severity_scoring.ts auto-calculates severity (critical/high/medium/low)
  → Incident created with status: 'submitted'
  → Real-time notification to dispatch via Supabase Realtime
  → Telegram alert to assigned rescue unit chat (if configured)
```

### 8.3 Offline SOS Flow

```
Resident loses connectivity
  → SOS form still works (client-side)
  → offline-sos-queue.ts stores submission in localStorage
  → network_status_at_creation = 'offline'
  → queued_offline_at timestamp recorded
  → On reconnection, queue syncs to server
  → delivery_status = 'delayed' with delay minutes calculated
```

### 8.4 Dispatch Operations Flow

```
Incident submitted
  → Appears on Dispatch dashboard (/dispatch)
  → Real-time map shows incident pin
  → Notification sound plays
  → Dispatcher reviews incident details:
      - Reporter info, location, severity, triage answers
      - Created vs. sent location comparison (dual-location-map)
  → Status progression:
      submitted → received → verification_pending → verified
      → assigned (select rescue unit) → accepted → preparing
      → dispatched → on_the_way → arrived
      → operation_in_progress → transporting → resolved → closed
  → OR: cancelled / false_alert / duplicate / invalid / transferred
  → Each status change:
      - Recorded in incident_status_history
      - Timeline event created
      - Resident notified
      - Timestamps updated (verified_at, dispatched_at, arrived_at, resolved_at, closed_at)
```

### 8.5 Rescue Team Field Flow

```
Team Leader/Responder Dashboard (/rescue-team)
  → See assigned incidents
  → Accept/Decline assignment
  → Update field status:
      accepted → preparing → dispatched → on_the_way
      → arrived → operation_in_progress → resolved
  → Add incident notes
  → Upload attachments (photos from scene)
```

### 8.6 Admin Operations

```
Admin Dashboard (/admin)
  → Requires master key to unlock editing
  → Manage incidents (view, update status, assign, escalate)
  → Manage residents (approve/reject registrations, view profiles)
  → Manage rescue units (create teams, add members, set specializations)
  → View live map with incident pins and unit locations
  → Reports (filters, KPI cards, charts, CSV/JSON export)
  → Audit logs (track all actions by all users)
  → Settings (organization config, emergency types, hotlines)
  → QR poster generation for resident registration
  → Secure logout (password-confirmed)
```

### 8.7 Super Admin Platform Management

```
Super Admin Dashboard (/super-admin)
  → Manage organizations (create, configure, suspend)
  → Manage municipalities (geographic scope, map center)
  → Create staff accounts for organizations
  → "Login as Admin" impersonation
  → Owner test mode for QA
```

---

## 9. Real-Time Features

- **Supabase Realtime** — `use-realtime-incidents.ts` subscribes to the `incidents` table for live updates on the dispatch and admin dashboards
- **Notification sounds** — `notification-sound.ts` plays audio alerts for new incidents (configurable per user via `admin-sound-toggle.tsx`)
- **Escalation monitoring** — `escalation-rules.ts` defines time-based rules (e.g., if incident not acknowledged within X minutes, auto-escalate severity)

---

## 10. Security Architecture

| Layer | Implementation |
|-------|---------------|
| Auth | Supabase Auth with email/password; no plain-text credentials stored |
| RLS | Row-Level Security on all 27 tables; users only see data for their organization |
| Input sanitization | `sanitize.ts` — strips HTML tags, script patterns, null bytes from all user input |
| Rate limiting | Client-side (`rate-limiter.ts`) + server-side (`server-rate-limiter.ts`) |
| CSP | Content Security Policy headers in `next.config.ts` |
| Master key | Bcrypt-hashed per-organization key required for admin destructive actions |
| Trusted sessions | Server-validated tokens with 90-day expiry; cookie flag is a lightweight signal only (token stays in localStorage) |
| Proxy auth check | `proxy.ts` validates Supabase session on every protected route |
| Admin logout | Password-confirmed to prevent unauthorized logouts |
| Coverage lock | Organizations locked to specific geographic scope (region/province/municipality via PSGC codes) |

### Security Constraints (Hard Rules)

- Do not store plain-text passwords or raw credentials
- Do not replace Leaflet/OpenStreetMap with Google Maps
- Ops/Admin users cannot change their assigned municipality or coverage location
- Only admin can delete and edit reports
- Do not activate risky or incomplete national routing
- Do not fake persistent SMS if not allowed or unsafe

---

## 11. Geographic Coverage System

Each organization is locked to a geographic scope via `organization_geo_scopes`:

- **Scope levels:** country, region, province, municipality
- **PSGC-based:** Uses Philippine Standard Geographic Code for precise matching
- **Coverage lock API:** `/api/coverage-lock` validates that incidents and registrations fall within the organization's coverage area
- **Philippines geography data:** `philippines-geography.ts` + `philippines-geography-data.json` provide region/province/municipality lookup

---

## 12. Deployment Architecture

```
GitHub (main branch)
  → Push triggers Vercel auto-deploy
  → Vercel builds with Turbopack
  → Production URL: https://www.rescue-portal.ph
  → Vercel project: rescue-portal (prj_A9omCAfV6tYWqz2RLbxBEWpFsbIv)
  → Vercel team: cfx-5002d3b9

Supabase (hosted)
  → Project ID: jlbjwckqaydzdfhhubps
  → PostgreSQL database with RLS
  → Auth service (email/password + magic links)
  → Realtime subscriptions
  → Storage (file attachments)
```

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (client-side)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side admin operations)
- `NEXT_PUBLIC_APP_URL` — Production URL (https://www.rescue-portal.ph)

---

## 13. Mobile Support

The project includes Capacitor configuration for building native Android APKs:

- `@capacitor/core` + `@capacitor/android` installed
- Scripts: `cap:sync`, `cap:open`, `cap:build`
- The web app is wrapped in a native shell for distribution
- Service worker (`sw-register.tsx`) enables offline capabilities
- Offline SOS queue persists submissions when connectivity is lost

---

## 14. Feature Scope Summary

### Resident-Facing

- QR code-linked municipality registration with government ID verification
- Multi-step emergency reporting with triage questions
- 3-second hold-to-confirm SOS (prevents accidental reports)
- Reporter role selection (victim vs. passerby)
- GPS location capture with accuracy tracking
- Incident history with status tracking
- Offline SOS with sync-on-reconnect
- 90-day trusted device session persistence
- Emergency hotline directory

### Operations/Admin-Facing

- Real-time incident map with Leaflet/OpenStreetMap
- Incident queue with severity, status, and delivery badges
- Full incident lifecycle management (24 status states)
- Rescue unit assignment and tracking
- Resident verification and approval workflow
- Reports with date range filters, KPI cards, charts, CSV/JSON export
- Audit log with actor/action/entity tracking
- Organization settings and emergency type management
- QR poster generator for resident onboarding
- Notification center with priority levels
- Telegram dispatch alerts
- Master key-protected destructive actions
- Password-confirmed admin logout
- Shift scheduling for rescue teams
- Barangay management with polygon coordinates

### Platform Owner (Super Admin)

- Multi-organization management
- Municipality geographic scoping (PSGC-based)
- Staff account provisioning
- Admin impersonation ("Login as Admin")
- Subscription tier management (free/basic/pro/enterprise)
- Owner test mode for QA

---

## 15. Incident Status State Machine

```
submitted
  → received
    → verification_pending
      → verified
        → assigned
          → accepted
            → preparing
              → dispatched
                → on_the_way
                  → arrived
                    → operation_in_progress
                      → transporting
                        → resolved
                          → closed

Terminal/branch states (reachable from most active states):
  → cancelled
  → false_alert / false_alarm
  → duplicate
  → invalid
  → unable_to_contact
  → transferred (to another jurisdiction)
```

---

## 16. Key API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register-resident` | Resident self-registration |
| POST | `/api/auth/trusted-session-refresh` | 90-day session recovery |
| POST | `/api/resident/incidents` | Submit emergency report |
| POST | `/api/resident/incidents/sos` | Quick SOS submission |
| GET | `/api/admin/incidents` | List incidents (filtered) |
| PATCH | `/api/admin/incidents/[id]/status` | Update incident status |
| POST | `/api/admin/incidents/[id]/assignments` | Assign rescue unit |
| POST | `/api/admin/incidents/[id]/escalate` | Escalate incident |
| POST | `/api/admin/incidents/manual` | Manual incident creation |
| GET | `/api/admin/residents` | List residents |
| PATCH | `/api/admin/residents/[id]/status` | Approve/reject resident |
| POST | `/api/admin/teams` | Create rescue unit |
| POST | `/api/admin/verify-master-key` | Verify admin master key |
| POST | `/api/admin/secure-logout` | Password-confirmed logout |
| POST | `/api/admin/change-password` | Change password |
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/coverage-lock` | Validate geographic coverage |
| GET | `/api/municipality-info` | Public municipality details |
| GET | `/api/emergency-types` | Public emergency type list |
| POST | `/api/super-admin/tenants` | Create organization |
| POST | `/api/super-admin/staff` | Create staff account |
| POST | `/api/super-admin/login-as-admin` | Admin impersonation |

---

*This document reflects the current production state of the Emergency Rescue Portal as deployed at https://www.rescue-portal.ph.*
