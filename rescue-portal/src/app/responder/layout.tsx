'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function ResponderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="h-14 flex items-center gap-2 px-4 bg-slate-900 border-b border-slate-800">
        <Shield className="w-6 h-6 text-red-500" />
        <span className="font-bold text-sm">Responder View</span>
        <div className="ml-auto">
          <Link href="/admin" className="text-xs text-slate-400 hover:text-white">
            Admin Panel →
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
