'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, Search, Shield, Flame, Siren, Building2, Radio, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROVINCES } from '@/lib/hotline-data'


/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */

export default function EmergencyHotlinesPage() {
  const [search, setSearch] = useState('')
  const [activeProvince, setActiveProvince] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = PROVINCES

    if (activeProvince !== 'all') {
      list = list.filter((p) => p.province === activeProvince)
    }

    if (!q) return list

    return list
      .map((prov) => ({
        ...prov,
        municipalities: prov.municipalities.filter((m) =>
          m.name.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (prov) =>
          prov.municipalities.length > 0 ||
          prov.province.toLowerCase().includes(q)
      )
  }, [search, activeProvince])

  const totalMunicipalities = PROVINCES.reduce(
    (sum, p) => sum + p.municipalities.length,
    0
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <span className="text-sm font-semibold">rescue-portal.ph</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* TITLE */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20">
            <Phone className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
            Emergency Hotlines Directory
          </h1>
          <p className="mx-auto max-w-2xl text-slate-400">
            Region 2 — Cagayan Valley &middot; {totalMunicipalities} municipalities across 5 provinces
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PNP &middot; BFP &middot; MDRRMO / LGU Rescue &middot; Updated from official sources
          </p>
        </div>

        {/* NATIONAL / REGIONAL HOTLINES BAR */}
        <div className="mb-8 rounded-xl border border-red-900/40 bg-red-950/30 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-400">
            Quick Dial — National &amp; Regional
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Siren, label: 'National Emergency', number: '911', accent: 'text-red-400' },
              { icon: Shield, label: 'PNP Hotline', number: '117 / 8722-0650', accent: 'text-blue-400' },
              { icon: Flame, label: 'BFP Hotline', number: '(02) 8426-0219', accent: 'text-orange-400' },
              { icon: Radio, label: 'PRO2 RPIO', number: '(078) 304-0074', accent: 'text-cyan-400' },
              { icon: Radio, label: 'PRO2 Ops Center', number: '0917-564-4974', accent: 'text-cyan-400' },
              { icon: Building2, label: 'Red Cross', number: '143', accent: 'text-red-400' },
            ].map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
              >
                <h.icon className={`h-4 w-4 shrink-0 ${h.accent}`} />
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">{h.label}</div>
                  <div className="truncate font-mono text-sm font-semibold text-white">
                    {h.number}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEARCH + FILTER BAR */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search municipality or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', ...PROVINCES.map((p) => p.province)].map((prov) => (
              <button
                key={prov}
                onClick={() => setActiveProvince(prov)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeProvince === prov
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {prov === 'all' ? 'All Provinces' : prov}
              </button>
            ))}
          </div>
        </div>

        {/* PROVINCE SECTIONS */}
        {filtered.map((prov) => (
          <section key={prov.province} className="mb-10">
            {/* Province Header */}
            <div className="mb-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-red-500" />
              <div>
                <h2 className="text-xl font-bold">{prov.province}</h2>
                <p className="text-xs text-slate-500">
                  {prov.municipalities.length} LGU{prov.municipalities.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Provincial-level contacts */}
            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Provincial Level
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {prov.provincial.pnp && (
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">PNP Provincial</div>
                      <div className="font-mono text-xs text-white">{prov.provincial.pnp}</div>
                    </div>
                  </div>
                )}
                {prov.provincial.bfp && (
                  <div className="flex items-start gap-2">
                    <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">BFP Provincial</div>
                      <div className="font-mono text-xs text-white">{prov.provincial.bfp}</div>
                    </div>
                  </div>
                )}
                {prov.provincial.pdrrmo && (
                  <div className="flex items-start gap-2">
                    <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">PDRRMO</div>
                      <div className="font-mono text-xs text-white">{prov.provincial.pdrrmo}</div>
                    </div>
                  </div>
                )}
              </div>
              {prov.provincial.other && prov.provincial.other.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {prov.provincial.other.map((o) => (
                    <div key={o.label} className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase text-slate-500">{o.label}:</span>
                      <span className="font-mono text-xs text-yellow-400">{o.number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Municipality Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Municipality / City
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-400">
                      <Shield className="mr-1 inline h-3 w-3" />
                      PNP
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-orange-400">
                      <Flame className="mr-1 inline h-3 w-3" />
                      BFP
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-green-400">
                      <Radio className="mr-1 inline h-3 w-3" />
                      MDRRMO / Rescue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prov.municipalities.map((m, i) => (
                    <tr
                      key={m.name}
                      className={`border-b border-slate-800/50 transition-colors hover:bg-slate-800/40 ${
                        i % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/30'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-white">
                        {m.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-300">
                        {m.pnp || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-300">
                        {m.bfp || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-300">
                        {m.rescue || '—'}
                        {m.other?.map((o) => (
                          <span key={o.label} className="ml-2 text-yellow-400">
                            ({o.label}: {o.number})
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <p className="text-lg text-slate-400">No matches found for &quot;{search}&quot;</p>
            <p className="text-sm text-slate-500">Try searching by municipality or province name</p>
          </div>
        )}

        {/* DISCLAIMER */}
        <div className="mt-8 rounded-lg border border-amber-900/30 bg-amber-950/20 p-4 text-center">
          <p className="text-xs text-amber-400/80">
            <strong>Disclaimer:</strong> Hotline numbers are sourced from official PNP, LGU, and provincial government directories.
            Numbers may change without notice. For the most current numbers, contact your municipal hall or the
            PRO2 Regional Operations Center at <span className="font-mono font-bold">0917-564-4974</span>.
          </p>
          <p className="mt-2 text-[10px] text-slate-500">
            Sources: PRO2 PNP • Province of Isabela PSO Emergency Hotline Directory (Oct 2023) •
            Nueva Vizcaya PPO • Quirino PDRRMO • Batanes Provincial Government •
            PNP Telephone Directory • Municipal LGU Websites
          </p>
        </div>

        {/* BACK CTA */}
        <div className="mt-8 text-center">
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            render={<Link href="/" />}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rescue Portal
          </Button>
        </div>
      </main>
    </div>
  )
}
