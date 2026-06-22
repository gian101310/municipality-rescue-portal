import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  MapPin,
  Phone,
  QrCode,
  Radio,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingSosDemo } from '@/components/landing-sos-demo'
import { PremiumFooter } from '@/components/premium-footer'
import { MobileNav } from '@/components/mobile-nav'

const responseStats = [
  ['4-step', 'resident emergency flow'],
  ['GPS', 'location-aware routing'],
  ['24/7', 'command-center visibility'],
]

const workflowSteps = [
  {
    icon: Users,
    title: 'Verify residents before access',
    text: 'Residents register with contact, address, ID, and emergency contact details before requests are enabled.',
  },
  {
    icon: Bell,
    title: 'Receive structured SOS reports',
    text: 'Approved residents submit emergency type, hazards, affected count, and precise GPS location.',
  },
  {
    icon: Radio,
    title: 'Coordinate response from one desk',
    text: 'Dispatchers review, update status, and keep incidents visible across the municipal operations view.',
  },
]

const operationRows = [
  ['INC-20260619-000042', 'Medical emergency', 'Critical', 'On the way'],
  ['INC-20260619-000041', 'Flood rescue', 'High', 'Verified'],
  ['INC-20260619-000040', 'Fire alert', 'Critical', 'Assigned'],
]

const adminCapabilities = [
  { icon: MapPin, title: 'Live Map Focus', text: 'Keep alerts centered on the configured city or municipality.' },
  { icon: ClipboardCheck, title: 'Resident Approval', text: 'Approve, reject, and monitor local resident registrations.' },
  { icon: ShieldCheck, title: 'Audit Trail', text: 'Track status changes and response activity for accountability.' },
  { icon: Lock, title: 'Role-Based Access', text: 'Separate platform owner, municipal admin, dispatcher, and resident views.' },
]

const trustItems = [
  'Location-locked municipal deployments',
  'Approved resident access before SOS reporting',
  'Server-side admin actions for sensitive controls',
  'Designed for LGU, MDRRMO, and CDRRMO operations',
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="relative min-h-[92vh] overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(2,6,23,0.94) 0%, rgba(2,6,23,0.84) 45%, rgba(2,6,23,0.58) 100%), url("https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2200&q=80")',
        }}
      >
        <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-950/40">
              <Shield className="h-5 w-5 text-white" />
            </span>
            <span className="font-bold tracking-tight">Emergency Rescue Portal</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
            <a href="#response-flow" className="transition-colors hover:text-white">Residents</a>
            <a href="#operations" className="transition-colors hover:text-white">Command Center</a>
            <a href="#coverage" className="transition-colors hover:text-white">Coverage</a>
            <Link href="/how-it-works" className="transition-colors hover:text-white">How It Works</Link>
            <Link href="/emergency-hotlines" className="transition-colors hover:text-white">Hotlines</Link>
            <Link href="/auth/login" className="text-slate-400 transition-colors hover:text-white">Municipality Login</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden border-slate-600 bg-slate-900/60 text-white hover:bg-slate-800 sm:inline-flex" render={<Link href="/auth/login" />}>
              <Shield className="mr-2 h-4 w-4" />
              Staff / Admin
            </Button>
            <MobileNav />
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(92vh-4rem)] max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="max-w-3xl">
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Municipal rescue command, ready before the first call arrives.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              A premium emergency response portal for verified residents, GPS-based SOS reports,
              municipality-focused maps, and coordinated rescue operations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="h-10 bg-red-600 px-4 text-white hover:bg-red-700" render={<a href="#how-to-register" />}>
                <QrCode className="mr-2 h-4 w-4" />
                How to Register
              </Button>
              <Button variant="outline" className="h-10 border-white/25 bg-white/10 px-4 text-white hover:bg-white/20" render={<Link href="/auth/login" />}>
                <Shield className="mr-2 h-4 w-4" />
                Municipality Login
              </Button>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {responseStats.map(([value, label]) => (
                <div key={label} className="border-l border-red-300/35 pl-3">
                  <dt className="text-xl font-black text-white sm:text-2xl">{value}</dt>
                  <dd className="mt-1 text-xs leading-5 text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/88 p-3 shadow-2xl shadow-slate-950/60 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 px-2 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-300" />
                  Live operations preview
                </div>
              </div>

              <div className="grid gap-3 pt-3 lg:grid-cols-[1fr_0.8fr]">
                <div className="min-h-80 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Focused Municipality Map</p>
                      <p className="mt-1 text-xs text-slate-500">Simulated alert pins and response routing</p>
                    </div>
                    <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">LIVE</span>
                  </div>
                  <div className="relative mt-5 h-56 overflow-hidden rounded-lg border border-slate-800 bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#082f49_100%)]">
                    <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:28px_28px]" />
                    <div className="absolute left-[18%] top-[28%] h-4 w-4 rounded-full border-4 border-red-300 bg-red-600 shadow-[0_0_24px_rgba(248,113,113,0.9)]" />
                    <div className="absolute left-[62%] top-[38%] h-4 w-4 rounded-full border-4 border-blue-200 bg-blue-500 shadow-[0_0_22px_rgba(96,165,250,0.8)]" />
                    <div className="absolute left-[45%] top-[68%] h-4 w-4 rounded-full border-4 border-amber-200 bg-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.8)]" />
                    <div className="absolute left-[22%] top-[33%] h-px w-[44%] rotate-12 bg-red-300/45" />
                    <div className="absolute bottom-3 left-3 right-3 rounded-md border border-slate-700 bg-slate-950/85 p-3">
                      <p className="text-xs font-semibold text-slate-200">Nearest responder: Alpha 1</p>
                      <p className="mt-1 text-xs text-slate-500">ETA preview: 6 min • route lock active</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm font-semibold text-white">Incident Queue</p>
                    <div className="mt-3 space-y-2">
                      {operationRows.map(([ref, type, severity, status]) => (
                        <div key={ref} className="rounded-md border border-slate-800 bg-slate-950 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-200">{ref}</p>
                            <span className={severity === 'Critical' ? 'text-xs font-bold text-red-300' : 'text-xs font-bold text-amber-300'}>{severity}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>{type}</span>
                            <span>{status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-4">
                    <p className="text-sm font-semibold text-blue-100">Responder Status</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded-md bg-slate-950/80 p-2 text-slate-300">1 available</span>
                      <span className="rounded-md bg-slate-950/80 p-2 text-slate-300">2 assigned</span>
                      <span className="rounded-md bg-slate-950/80 p-2 text-slate-300">4 alerts today</span>
                      <span className="rounded-md bg-slate-950/80 p-2 text-slate-300">Audit ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="response-flow" className="border-t border-slate-800 bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-300">Resident Response Flow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">A cleaner path from resident request to verified response.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                The public experience is intentionally simple. Residents register once, wait for approval,
                then report emergencies with structured details that help dispatchers triage faster.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {workflowSteps.map((item, index) => (
                <article key={item.title} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-6 w-6 text-red-300" />
                    <span className="text-xs font-black text-slate-700">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="operations" className="border-t border-slate-800 bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">Command Center</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Built for real municipal operations, not a generic contact form.</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-400">
              The admin side is designed around visibility: incidents, residents, responders, maps, and audit logs in one operational surface.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {adminCapabilities.map((item) => (
              <article key={item.title} className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                <item.icon className="h-6 w-6 text-blue-300" />
                <h3 className="mt-5 font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="coverage" className="border-t border-slate-800 bg-slate-950 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-6">
            <MapPin className="h-7 w-7 text-amber-300" />
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Deploy per municipality, province, or service area.</h2>
            <p className="mt-4 text-sm leading-7 text-amber-50/70">
              The platform owner can lock each client municipality to its covered geography, while local admins work inside their assigned operating area.
            </p>
          </div>

          <div id="trust" className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <FileText className="h-7 w-7 text-red-300" />
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Designed for trust, traceability, and safer access.</h2>
            <div className="mt-6 space-y-3">
              {trustItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-to-register" className="border-t border-slate-800 bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">For Residents</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">How to Register</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Registration is handled through your municipality. Each participating LGU has a unique QR code and link
              that connects you directly to their rescue portal.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600/20 border border-amber-500/30">
                <QrCode className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Scan QR Code</h3>
              <p className="mt-2 text-sm text-slate-400">
                Look for the official rescue portal QR code at your municipal hall, barangay office, or local MDRRMO.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30">
                <Users className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">2. Fill Out Your Details</h3>
              <p className="mt-2 text-sm text-slate-400">
                The form will already show your municipality. Enter your personal details, address, ID, and emergency contact.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600/20 border border-green-500/30">
                <CheckCircle2 className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">3. Wait for Approval</h3>
              <p className="mt-2 text-sm text-slate-400">
                Your local admin will verify your identity and approve your registration. You&apos;ll receive login access once approved.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-amber-500/20 bg-amber-500/10 p-5 text-center">
            <p className="text-sm font-semibold text-amber-200">
              Don&apos;t have a QR code yet?
            </p>
            <p className="mt-1 text-sm text-amber-100/70">
              Ask your barangay captain, municipal hall, or local MDRRMO office for the official rescue portal registration link.
              Each municipality has its own unique link — there is no generic registration.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800" render={<Link href="/auth/login" />}>
              <Shield className="mr-2 h-4 w-4" />
              Municipality Staff / Admin Login
            </Button>
          </div>
        </div>
      </section>

      <PremiumFooter />
      <LandingSosDemo />
    </main>
  )
}
