import Link from 'next/link'
import { Mail, MapPin, Phone, Shield } from 'lucide-react'

const footerColumns = [
  {
    title: 'Product',
    links: [
      ['Resident Reporting', '/auth/register'],
      ['Command Center', '/auth/login'],
      ['Live Map', '/auth/login'],
      ['Verification', '/auth/login'],
      ['Reports', '/auth/login'],
    ],
  },
  {
    title: 'Platform',
    links: [
      ['Municipality Coverage', '#coverage'],
      ['Staff Roles', '#operations'],
      ['Audit Logs', '#trust'],
      ['QR Posters', '/auth/login'],
      ['Admin Settings', '/auth/login'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['Privacy Notice', '#footer-notice'],
      ['Terms of Use', '#footer-notice'],
      ['Data Protection', '#trust'],
      ['Emergency Use Notice', '#footer-notice'],
      ['Deployment Inquiry', 'mailto:support@rescueportal.ph'],
    ],
  },
]

export function PremiumFooter() {
  return (
    <footer id="footer-notice" className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.5fr_0.9fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-950/40">
                <Shield className="h-5 w-5 text-white" />
              </span>
              <span className="font-bold tracking-tight">Emergency Rescue Portal</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Municipal emergency coordination for verified residents, dispatch teams, and location-focused response operations.
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-400">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-300" /> Emergency hotline remains 911 for life-threatening cases.</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-300" /> support@rescueportal.ph</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-300" /> Built for Philippine LGU deployments.</p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">{column.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-slate-500 transition-colors hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-4">
            <h3 className="text-sm font-semibold text-red-100">Emergency Use Notice</h3>
            <p className="mt-3 text-sm leading-6 text-red-100/75">
              This portal supports local emergency coordination and does not replace national emergency numbers.
              For life-threatening emergencies, call 911 immediately.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>(c) 2026 Emergency Rescue Portal. Municipal emergency response platform.</p>
          <p>Designed for verified access, auditability, and local government deployment.</p>
        </div>
      </div>
    </footer>
  )
}
