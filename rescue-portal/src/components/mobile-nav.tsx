'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Shield, Phone } from 'lucide-react'

const links = [
  { href: '#response-flow', label: 'Residents', external: false },
  { href: '#operations', label: 'Command Center', external: false },
  { href: '#coverage', label: 'Coverage', external: false },
  { href: '/how-it-works', label: 'How It Works', external: false },
  { href: '/emergency-hotlines', label: 'Emergency Hotlines', external: false },
  { href: '/auth/login', label: 'Municipality Login', external: false },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-slate-800 bg-slate-950/98 px-4 pb-4 pt-2 backdrop-blur-sm">
          <nav className="flex flex-col gap-1">
            {links.map((link) =>
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {link.label === 'Emergency Hotlines' && <Phone className="mr-2 inline h-4 w-4 text-red-500" />}
                  {link.label === 'Municipality Login' && <Shield className="mr-2 inline h-4 w-4 text-slate-500" />}
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
