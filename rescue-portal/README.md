# Municipality Rescue Portal

A comprehensive emergency response management system built for Philippine local government units (LGUs). The portal enables residents to report emergencies and request rescue services, while providing administrators with a real-time dashboard for triage, dispatch, and tracking.

## Features

### Resident Side
- **Registration** with name, government ID, phone, and barangay details
- **Emergency reporting** with type selection (earthquake, typhoon, medical, fire, flood, vehicular, missing person, crime, animal, storm)
- **GPS location** capture with manual address fallback
- **Triage questionnaires** tailored per emergency type
- **Real-time status tracking** of submitted incidents
- **Incident history** with full timeline view

### Admin Side
- **Live map dashboard** with color-coded alert pins by severity
- **Incident management** with 20+ status workflow states
- **Rescue unit dispatch** and team management
- **Resident verification** workflow (ID-based)
- **Audit logging** of all system actions
- **Reports and analytics** with charts
- **System health monitoring**
- **Role-based access control** (7 roles: Super Admin, Admin, Dispatcher, Team Leader, Responder, Verifier, Resident)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, RLS)
- **Maps**: Leaflet / OpenStreetMap
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm (`npm install -g pnpm`)

### Installation

```bash
cd rescue-portal
pnpm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-maps-key
```

Set `NEXT_PUBLIC_DEMO_MODE=true` to run with built-in Philippine demo data (no Supabase required).

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

### Demo Mode

The app ships with a full demo dataset including:
- 15 sample incidents across all emergency types
- 5 rescue units with realistic Philippine locations
- 8 staff/resident user profiles
- Audit logs, notifications, and statistics
- Philippine geography (Pampanga province, 5 municipalities, 20 barangays)

Demo login accounts are shown on the login page when `NEXT_PUBLIC_DEMO_MODE=true`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin dashboard pages
│   │   ├── audit/          # Audit log viewer
│   │   ├── health/         # System health monitor
│   │   ├── incidents/      # Incident list + detail
│   │   ├── map/            # Live map with alert pins
│   │   ├── reports/        # Analytics & charts
│   │   ├── residents/      # Resident management
│   │   ├── settings/       # System settings
│   │   ├── teams/          # Rescue unit management
│   │   └── verification/   # ID verification workflow
│   ├── auth/               # Login & registration
│   └── resident/           # Resident-facing pages
│       ├── emergency/      # Emergency report form
│       ├── history/        # Incident history
│       └── profile/        # Profile management
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── demo-banner.tsx     # Demo mode indicator
│   └── emergency-type-icon.tsx  # Dynamic icon mapper
└── lib/
    ├── demo-data.ts        # Complete demo dataset
    ├── types.ts            # TypeScript type definitions
    └── utils.ts            # Utility functions
```

## Emergency Types

| Type | Icon | Description |
|------|------|-------------|
| Earthquake | Activity | Structural collapse, trapped persons |
| Typhoon | CloudHail | Storm surge, flooding, wind damage |
| Medical | Stethoscope | Medical emergencies, injuries |
| Fire | Flame | Structure fires, wildfires |
| Flood | Waves | Flash floods, rising water |
| Vehicular | Car | Traffic accidents, collisions |
| Missing Person | UserSearch | Search and rescue operations |
| Crime/Violence | ShieldAlert | Assault, robbery, threats |
| Animal Rescue | PawPrint | Stray/injured animals |
| Storm/Lightning | CloudLightning | Severe weather events |

## Deployment

The app is configured for Vercel deployment:

```bash
vercel --prod
```

## License

MIT
