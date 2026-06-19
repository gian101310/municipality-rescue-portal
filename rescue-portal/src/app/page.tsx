import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardCheck,
  Lock,
  MapPin,
  Phone,
  Shield,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const residentSteps = [
  {
    icon: Users,
    title: 'Register as a resident',
    text: 'Residents submit contact, address, and ID details for local verification.',
  },
  {
    icon: ClipboardCheck,
    title: 'Wait for approval',
    text: 'Authorized staff review registrations before emergency request access is enabled.',
  },
  {
    icon: Bell,
    title: 'Request help when approved',
    text: 'Approved residents can send emergency details and location to the response desk.',
  },
]

const adminTools = [
  { icon: MapPin, label: 'Focused municipality map and alert locations' },
  { icon: Phone, label: 'Resident contact details for verified responders' },
  { icon: Shield, label: 'Incident tracking, triage, and status updates' },
  { icon: Lock, label: 'Role-based access for municipal staff' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="relative min-h-[88vh] bg-cover bg-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1800&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/78" />
        <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
              <Shield className="h-5 w-5 text-white" />
            </span>
            <span className="font-bold tracking-tight">Emergency Rescue Portal</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-200 sm:flex">
            <a href="#resident-flow" className="hover:text-white">Residents</a>
            <a href="#admin-flow" className="hover:text-white">Municipal Staff</a>
            <Link href="/auth/login" className="hover:text-white">Login</Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(88vh-4rem)] max-w-6xl items-center px-4 pb-16 pt-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-sm text-red-100">
              <AlertTriangle className="h-4 w-4" />
              Municipal emergency access portal
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Emergency Rescue Portal
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              A web portal for local governments to verify residents, receive emergency requests,
              focus response maps on their municipality, and coordinate rescue operations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="bg-red-600 text-white hover:bg-red-700" render={<Link href="/auth/register" />}>
                Register as Resident
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" render={<Link href="/auth/login" />}>
                Staff / Resident Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="resident-flow" className="border-t border-slate-800 bg-slate-950 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Resident Access</p>
            <h2 className="mt-2 text-3xl font-bold">Registration is reviewed before emergency requests are enabled.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {residentSteps.map((item) => (
              <article key={item.title} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <item.icon className="mb-4 h-6 w-6 text-red-300" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="admin-flow" className="border-t border-slate-800 bg-slate-900 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Municipal Staff</p>
            <h2 className="mt-2 text-3xl font-bold">Client municipality access can be locked to one region, province, city, or municipality.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Each client municipality can operate inside its configured service area. Staff accounts are created by
              the platform owner or municipality administrator, while residents pass through approval first.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {adminTools.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <span className="text-sm text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Ready to test the portal?</h2>
            <p className="mt-1 text-sm text-slate-400">Use the login page for owner, municipal admin, staff, or approved resident accounts.</p>
          </div>
          <Button className="bg-red-600 text-white hover:bg-red-700" render={<Link href="/auth/login" />}>
            Open Login
          </Button>
        </div>
      </section>
    </main>
  )
}
