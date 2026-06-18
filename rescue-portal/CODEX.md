# Codex Handoff — Municipality Rescue Portal

## Quick Start

```bash
cd rescue-portal
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build (Turbopack)
```

Package manager is **pnpm** (not npm — npm has a known bug with `@tailwindcss/postcss` in this project).

## What This Is

A municipal emergency response web app for Philippine LGUs. Residents register, report emergencies (fire, flood, earthquake, typhoon, etc.), and send GPS location. Admin dispatchers see a live map with alert pins, manage incidents, update statuses, and coordinate rescue units.

**Live site:** https://rescue-portal.vercel.app
**Repo:** https://github.com/gian101310/municipality-rescue-portal

## Tech Stack

| Layer        | Tech                                             |
|-------------|--------------------------------------------------|
| Framework   | Next.js 16.2.9 (App Router, Turbopack)           |
| Language    | TypeScript (strict mode)                          |
| Styling     | Tailwind CSS v4 via `@tailwindcss/postcss`        |
| UI          | shadcn/ui (Base UI), Lucide icons, Recharts       |
| Map         | Leaflet + OpenStreetMap (dark CARTO tiles)         |
| Forms       | react-hook-form + Zod validation                  |
| Backend     | Supabase (PostgreSQL, Auth, Realtime, Storage, RLS)|
| Deployment  | Vercel (pnpm, auto-detected Next.js)              |
| Toasts      | Sonner                                            |

## Current Mode

The app runs in **demo mode** (`NEXT_PUBLIC_DEMO_MODE=true`). All data comes from `src/lib/demo-data.ts` — no real Supabase connection needed. Demo accounts (password: `demo123456`):

| Role         | Email                        | Redirect   |
|-------------|------------------------------|------------|
| Super Admin | admin@rescueportal.ph        | /admin     |
| Dispatcher  | dispatcher@rescueportal.ph   | /admin     |
| Team Leader | teamlead@rescueportal.ph     | /admin     |
| Resident    | resident@rescueportal.ph     | /resident  |

## Project Structure

```
rescue-portal/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout (Sonner, ThemeProvider)
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Login (Suspense-wrapped for useSearchParams)
│   │   │   └── register/page.tsx       # Resident registration
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin shell (sidebar, topbar)
│   │   │   ├── page.tsx                # Command Center dashboard
│   │   │   ├── incidents/page.tsx      # Incident list + filters
│   │   │   ├── incidents/[id]/page.tsx # Incident detail (dynamic route)
│   │   │   ├── map/page.tsx            # Live Map (Leaflet/OSM)
│   │   │   ├── teams/page.tsx          # Rescue unit management
│   │   │   ├── residents/page.tsx      # Resident directory
│   │   │   ├── verification/page.tsx   # ID verification queue
│   │   │   ├── reports/page.tsx        # Analytics (Recharts)
│   │   │   ├── audit/page.tsx          # Audit log viewer
│   │   │   ├── settings/page.tsx       # System settings
│   │   │   └── health/page.tsx         # System health monitor
│   │   └── resident/
│   │       ├── layout.tsx              # Resident shell
│   │       ├── page.tsx                # Resident dashboard
│   │       ├── emergency/page.tsx      # Submit emergency report
│   │       ├── history/page.tsx        # My incident history
│   │       └── profile/page.tsx        # Profile management
│   ├── components/
│   │   ├── map-view.tsx                # Leaflet map (dynamic import, SSR-safe)
│   │   ├── demo-banner.tsx             # Yellow banner when demo mode on
│   │   ├── emergency-type-icon.tsx     # Dynamic Lucide icon by name
│   │   ├── incident-status-badge.tsx   # Status badge with colors
│   │   ├── severity-badge.tsx          # Severity level badge
│   │   ├── notification-center.tsx     # Bell icon + dropdown
│   │   └── ui/                         # shadcn/ui primitives (20+ components)
│   └── lib/
│       ├── types.ts                    # All TypeScript types & enums
│       ├── demo-data.ts                # Mock data (incidents, users, teams, org)
│       ├── utils.ts                    # Helpers (cn, formatRelativeTime, severity colors)
│       ├── auth.ts                     # Auth helpers (demo + Supabase)
│       └── supabase/
│           ├── client.ts               # Browser Supabase client
│           ├── server.ts               # Server Supabase client
│           └── database.types.ts       # Generated DB types (placeholder)
├── .env.local                          # All env vars (demo mode enabled)
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

## Key Types

```typescript
type UserRole = 'super_admin' | 'admin' | 'dispatcher' | 'team_leader' | 'responder' | 'verifier' | 'resident'

type IncidentStatus = 'submitted' | 'received' | 'verification_pending' | 'verified' | 'assigned' |
  'accepted' | 'preparing' | 'dispatched' | 'on_the_way' | 'arrived' | 'operation_in_progress' |
  'transporting' | 'resolved' | 'closed' | 'duplicate' | 'invalid' | 'false_alert' | 'cancelled' |
  'unable_to_contact' | 'transferred'

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

type TeamStatus = 'available' | 'assigned' | 'preparing' | 'dispatched' | 'on_scene' |
  'returning' | 'off_duty' | 'unavailable'
```

Emergency types: Medical, Fire, Flood/Water Rescue, Vehicular Accident, Structural Collapse, Crime/Security, Hazmat, Missing Person, Animal Rescue, Earthquake, Typhoon/Storm.

## Architecture Decisions

1. **Demo mode first.** All features work without Supabase. The `isDemoMode` flag gates real vs mock auth/data. To connect real Supabase: set `NEXT_PUBLIC_DEMO_MODE=false` and provide real Supabase credentials in `.env.local`.

2. **Leaflet, not Google Maps.** The map uses `react-leaflet` with CARTO dark tiles. No API key needed. The `MapView` component dynamically imports Leaflet to avoid SSR issues.

3. **Next.js 16 Suspense requirement.** Any component using `useSearchParams()` must be wrapped in `<Suspense>`. See `auth/login/page.tsx` for the pattern.

4. **Tailwind v4.** Uses `@tailwindcss/postcss` plugin (not the v3 `tailwindcss` PostCSS plugin). Config is in `postcss.config.mjs`. Global styles in `src/app/globals.css` use `@import "tailwindcss"`.

5. **shadcn/ui with Base UI.** Components in `src/components/ui/` are generated by shadcn v4 which uses `@base-ui/react` under the hood (not Radix). The `Button` component uses `render` prop for polymorphism (e.g., `<Button render={<Link href="..." />}>`).

## Environment Variables

```env
NEXT_PUBLIC_DEMO_MODE=true                    # Toggle demo/production mode
NEXT_PUBLIC_SUPABASE_URL=https://...          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...             # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...                 # Server-side only
NEXT_PUBLIC_MUNICIPALITY_NAME=Municipality of Bayani
NEXT_PUBLIC_MUNICIPALITY_PROVINCE=Laguna
NEXT_PUBLIC_MUNICIPALITY_REGION=CALABARZON
NEXT_PUBLIC_MAP_CENTER_LAT=14.1634            # Los Baños, Laguna
NEXT_PUBLIC_MAP_CENTER_LNG=121.2430
```

## Vercel Deployment

- **Project:** `rescue-portal` on team `cfx-5002d3b9`
- **Root directory:** Vercel deploys from `rescue-portal/` subdirectory
- **Env vars set:** `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deploy:
```bash
cd rescue-portal
npx vercel deploy --prod --yes
```

## What's Built (Complete)

- Landing page with feature showcase, hotline, how-it-works
- Full auth flow (login with role tabs, registration with ID upload)
- Admin Command Center with KPI cards, recent incidents, unit status
- Live interactive map with severity-colored pins and incident sidebar
- Incident management (list, detail, status updates, timeline)
- Rescue team management with unit status tracking
- Resident directory with verification workflow
- Reports page with Recharts analytics
- Audit log viewer
- System settings and health monitor
- Notification center with dropdown
- Responsive dark theme throughout

## What Needs Building Next

1. **Real Supabase integration** — Replace demo data with real DB queries. Schema is typed in `database.types.ts` (currently placeholder). Need migrations for: users, incidents, rescue_units, audit_logs, notifications, barangays tables. Enable RLS policies.

2. **Real-time updates** — Use Supabase Realtime to push incident status changes and new alerts to the admin dashboard without polling.

3. **GPS location capture** — The emergency form has a GPS button but needs `navigator.geolocation` wired up to actually capture and send coordinates.

4. **File/photo upload** — Registration ID upload and incident photo evidence need Supabase Storage integration.

5. **Telegram bot integration** — Env vars are ready. Need a bot that forwards critical alerts to a command center Telegram group.

6. **SMS notifications** — Alert residents about their incident status via SMS (Twilio or Semaphore for PH).

7. **PWA support** — Add service worker + manifest for offline-capable mobile use by residents in disaster areas.

## Known Gotchas

- **Do NOT use npm.** `npm install` silently fails to install `@tailwindcss/postcss`. Use `pnpm` only.
- **pnpm approve-builds** — After fresh install, run `pnpm approve-builds sharp unrs-resolver` to allow native build scripts.
- **Leaflet CSS** — The `MapView` component loads Leaflet CSS via a `<link>` tag in the component itself. This is intentional for SSR safety.
- **Next.js 16 breaking changes** — Read `node_modules/next/dist/docs/` before changing routing or middleware. APIs differ from v14/v15.
- **shadcn v4 uses Base UI** — Not Radix. Component APIs differ. Use `render` prop for composition, not `asChild`.
