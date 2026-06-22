'use client'

import { useState, useMemo } from 'react'
import { Phone, Search, Shield, Flame, Siren, MapPin, Radio } from 'lucide-react'
import { PROVINCES, REGION_HOTLINES } from '@/lib/hotline-data'
import type { ProvinceData, Agency } from '@/lib/hotline-data'

/* ------------------------------------------------------------------ */
/*  ADMIN HOTLINES – Ops quick-lookup for cross-municipality incidents */
/* ------------------------------------------------------------------ */

export default function AdminHotlinesPage() {
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
        municipalities: prov.municipalities.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            prov.province.toLowerCase().includes(q)
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

  const matchCount = filtered.reduce(
    (sum, p) => sum + p.municipalities.length,
    0
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Phone className="h-5 w-5 text-red-500" />
          Emergency Hotlines Directory
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Region 2 — Cagayan Valley &middot; {totalMunicipalities} LGUs across 5 provinces
        </p>
      </div>

      {/* Regional Quick-Dial */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'National Emergency', number: REGION_HOTLINES.national_emergency, icon: Siren, color: 'bg-red-600/20 text-red-400 border-red-500/30' },
          { label: 'PNP Hotline', number: REGION_HOTLINES.pnp_hotline, icon: Shield, color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
          { label: 'BFP Hotline', number: REGION_HOTLINES.bfp_hotline, icon: Flame, color: 'bg-orange-600/20 text-orange-400 border-orange-500/30' },
          { label: 'Red Cross', number: REGION_HOTLINES.red_cross, icon: Radio, color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
          { label: 'PRO2 OPCEN', number: REGION_HOTLINES.pro2_opcen, icon: Shield, color: 'bg-violet-600/20 text-violet-400 border-violet-500/30' },
          { label: 'PRO2 Landline', number: REGION_HOTLINES.pro2, icon: Phone, color: 'bg-slate-600/20 text-slate-300 border-slate-500/30' },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border p-3 ${item.color}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <p className="text-xs font-mono leading-relaxed">{item.number}</p>
          </div>
        ))}
      </div>

      {/* Search & Province Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search municipality, town, or city..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...PROVINCES.map((p) => p.province)].map((prov) => (
            <button
              key={prov}
              onClick={() => setActiveProvince(prov)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeProvince === prov
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {prov === 'all' ? 'All Provinces' : prov}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {search && (
        <p className="text-xs text-slate-500">
          {matchCount} result{matchCount !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Results */}
      <div className="space-y-6">
        {filtered.map((prov) => (
          <ProvinceSection key={prov.province} data={prov} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No municipalities found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Province Section                                                    */
/* ------------------------------------------------------------------ */

function ProvinceSection({ data }: { data: ProvinceData }) {
  return (
    <div>
      {/* Province Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          {data.province}
        </h2>
        <span className="text-xs text-slate-500">
          {data.municipalities.length} LGU{data.municipalities.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Provincial Office */}
      <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Provincial Office</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {data.provincial.pnp && (
            <div>
              <span className="text-blue-400 font-medium">PNP:</span>{' '}
              <span className="text-slate-300 font-mono">{data.provincial.pnp}</span>
            </div>
          )}
          {data.provincial.bfp && (
            <div>
              <span className="text-orange-400 font-medium">BFP:</span>{' '}
              <span className="text-slate-300 font-mono">{data.provincial.bfp}</span>
            </div>
          )}
          {data.provincial.pdrrmo && (
            <div>
              <span className="text-emerald-400 font-medium">PDRRMO:</span>{' '}
              <span className="text-slate-300 font-mono">{data.provincial.pdrrmo}</span>
            </div>
          )}
        </div>
        {data.provincial.other && data.provincial.other.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {data.provincial.other.map((o) => (
              <div key={o.label}>
                <span className="text-violet-400 font-medium">{o.label}:</span>{' '}
                <span className="text-slate-300 font-mono">{o.number}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Municipality Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400">
              <th className="text-left py-2 px-3 font-medium">Municipality / City</th>
              <th className="text-left py-2 px-3 font-medium">
                <span className="text-blue-400">PNP</span>
              </th>
              <th className="text-left py-2 px-3 font-medium">
                <span className="text-orange-400">BFP</span>
              </th>
              <th className="text-left py-2 px-3 font-medium">
                <span className="text-emerald-400">MDRRMO / Rescue</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.municipalities.map((m) => (
              <MunicipalityRow key={m.name} agency={m} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Municipality Row                                                    */
/* ------------------------------------------------------------------ */

function MunicipalityRow({ agency }: { agency: Agency }) {
  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      <td className="py-2 px-3 font-medium text-white whitespace-nowrap">
        {agency.name}
      </td>
      <td className="py-2 px-3 font-mono text-slate-300">
        <PhoneCell value={agency.pnp} />
      </td>
      <td className="py-2 px-3 font-mono text-slate-300">
        <PhoneCell value={agency.bfp} />
      </td>
      <td className="py-2 px-3 font-mono text-slate-300">
        <PhoneCell value={agency.rescue} />
        {agency.other && agency.other.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {agency.other.map((o) => (
              <div key={o.label} className="text-violet-400">
                <span className="font-sans font-medium">{o.label}:</span>{' '}
                <span className="text-slate-300">{o.number}</span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

function PhoneCell({ value }: { value?: string }) {
  if (!value || value === '—') return <span className="text-slate-600">—</span>
  return <>{value}</>
}
