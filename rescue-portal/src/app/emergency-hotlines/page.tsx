'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, Search, Shield, Flame, Siren, Building2, Radio, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */
/*  REGION 2 – CAGAYAN VALLEY EMERGENCY HOTLINES DIRECTORY            */
/* ------------------------------------------------------------------ */

type Agency = {
  name: string
  pnp?: string
  bfp?: string
  rescue?: string // MDRRMO / LGU Rescue
  other?: { label: string; number: string }[]
}

type ProvinceData = {
  province: string
  provincial: {
    pnp?: string
    bfp?: string
    pdrrmo?: string
    other?: { label: string; number: string }[]
  }
  municipalities: Agency[]
}

const REGION_HOTLINES = {
  pro2: '(078) 304-0074 / (078) 304-2897',
  pro2_opcen: '0917-564-4974',
  national_emergency: '911',
  pnp_hotline: '8722-0650 / 117',
  bfp_hotline: '(02) 8426-0219 / (02) 8426-0246',
  red_cross: '143',
}

const PROVINCES: ProvinceData[] = [
  /* ============ CAGAYAN ============ */
  {
    province: 'Cagayan',
    provincial: {
      pnp: '(078) 304-1477',
      bfp: '(078) 844-1422',
      pdrrmo: '(078) 844-1097',
    },
    municipalities: [
      { name: 'Tuguegarao City', pnp: '078 844-2004 / 0905-800-5118', bfp: '(078) 844-1422', rescue: '(078) 844-1097' },
      { name: 'Abulug', pnp: '0906-642-6468', bfp: '—', rescue: '—' },
      { name: 'Alcala', pnp: '0927-860-2133', bfp: '—', rescue: '—' },
      { name: 'Allacapan', pnp: '0906-832-3322', bfp: '—', rescue: '—' },
      { name: 'Amulung', pnp: '0936-440-2120', bfp: '—', rescue: '—' },
      { name: 'Aparri', pnp: '078 888-2597 / 0917-203-2003', bfp: '—', rescue: '—' },
      { name: 'Baggao', pnp: '0935-986-9494', bfp: '—', rescue: '—' },
      { name: 'Ballesteros', pnp: '0927-750-0799', bfp: '—', rescue: '—' },
      { name: 'Buguey', pnp: '0915-229-9200', bfp: '—', rescue: '—' },
      { name: 'Calayan', pnp: '0946-193-2489', bfp: '—', rescue: '—' },
      { name: 'Camalaniugan', pnp: '0998-967-3057', bfp: '—', rescue: '—' },
      { name: 'Claveria', pnp: '0906-438-6222', bfp: '—', rescue: '—' },
      { name: 'Enrile', pnp: '078 372-0055', bfp: '—', rescue: '—' },
      { name: 'Gattaran', pnp: '0916-517-7702', bfp: '—', rescue: '—' },
      { name: 'Gonzaga', pnp: '0917-899-6216', bfp: '—', rescue: '—' },
      { name: 'Iguig', pnp: '0917-599-1247', bfp: '—', rescue: '—' },
      { name: 'Lal-lo', pnp: '0905-201-1953', bfp: '—', rescue: '—' },
      { name: 'Lasam', pnp: '0998-967-3068', bfp: '—', rescue: '—' },
      { name: 'Pamplona', pnp: '0905-796-9547', bfp: '—', rescue: '—' },
      { name: 'Peñablanca', pnp: '078 304-0299 / 0926-171-2844', bfp: '—', rescue: '—' },
      { name: 'Piat', pnp: '0917-562-5508', bfp: '—', rescue: '—' },
      { name: 'Rizal', pnp: '0916-245-8090', bfp: '—', rescue: '—' },
      { name: 'Sanchez-Mira', pnp: '0977-741-8426', bfp: '—', rescue: '—' },
      { name: 'Santa Ana', pnp: '0927-435-2980', bfp: '—', rescue: '—' },
      { name: 'Santa Praxedes', pnp: '0998-967-3076', bfp: '—', rescue: '—' },
      { name: 'Santa Teresita', pnp: '0926-259-1257', bfp: '—', rescue: '—' },
      { name: 'Santo Niño', pnp: '0998-967-3078', bfp: '—', rescue: '0977-681-8744' },
      { name: 'Solana', pnp: '0998-967-3079', bfp: '—', rescue: '0997-312-9730' },
      { name: 'Tuao', pnp: '0998-967-3081', bfp: '—', rescue: '0997-293-7661' },
    ],
  },

  /* ============ ISABELA ============ */
  {
    province: 'Isabela',
    provincial: {
      pnp: '078 624-1453 / 0998-967-3084',
      bfp: '0916-556-2881',
      pdrrmo: '0915-819-3187',
      other: [
        { label: 'Bomb Squad / PECU', number: '0967-619-3007' },
        { label: 'IPPO', number: '0917-501-8212' },
      ],
    },
    municipalities: [
      // District 1
      { name: 'Cabagan', pnp: '0917-904-0181', bfp: '0936-748-8367', rescue: '0966-132-9009' },
      { name: 'Delfin Albano', pnp: '0977-801-9029', bfp: '0926-803-9466', rescue: '0917-653-3652' },
      { name: 'Divilacan', pnp: '0998-967-3088', bfp: '0946-425-4045', rescue: '0963-604-0286' },
      { name: 'City of Ilagan', pnp: '0917-145-5432', bfp: '0953-056-3939', rescue: '0915-234-1124' },
      { name: 'Maconacon', pnp: '0998-598-5234', bfp: '0920-386-8320', rescue: '0981-406-1703' },
      { name: 'San Pablo', pnp: '0998-598-5238', bfp: '0917-105-5336', rescue: '0917-577-9400' },
      { name: 'Santa Maria', pnp: '0905-680-0334', bfp: '0967-552-2866', rescue: '0939-714-3487' },
      { name: 'Santo Tomas', pnp: '0998-598-5237', bfp: '0905-044-6665', rescue: '0975-052-8519' },
      { name: 'Tumauini', pnp: '0998-598-5239', bfp: '0915-196-0342', rescue: '0999-655-2011' },
      // District 2
      { name: 'Benito Soliven', pnp: '0917-508-2945', bfp: '0916-894-2182', rescue: '0966-783-3357' },
      { name: 'Gamu', pnp: '0927-939-6862', bfp: '0935-458-1525', rescue: '0927-128-7232' },
      { name: 'Naguilian', pnp: '0998-598-5246', bfp: '0916-714-2763', rescue: '0929-460-6071' },
      { name: 'Palanan', pnp: '0917-124-1721', bfp: '0997-417-2526', rescue: '0975-463-5583' },
      { name: 'Reina Mercedes', pnp: '0935-532-8600', bfp: '0935-666-9917', rescue: '0997-609-1594' },
      { name: 'San Mariano', pnp: '0927-993-5330', bfp: '0926-500-3102', rescue: '0915-133-3320' },
      // District 3
      { name: 'Alicia', pnp: '0917-819-6449', bfp: '0966-935-1144', rescue: '0997-609-7679' },
      { name: 'Angadanan', pnp: '0936-971-1413', bfp: '0955-022-3236', rescue: '0927-142-8226' },
      { name: 'Cabatuan', pnp: '0915-667-0205', bfp: '0917-510-3246', rescue: '0936-947-1537' },
      { name: 'Ramon', pnp: '0998-598-5266', bfp: '0906-941-1743', rescue: '0906-713-5314' },
      { name: 'San Mateo', pnp: '0917-174-5655', bfp: '0927-824-9439', rescue: '0926-280-3804' },
      // District 4
      { name: 'Cordon', pnp: '0998-598-5262', bfp: '0926-946-8923', rescue: '0917-579-4645' },
      { name: 'Dinapigue', pnp: '0998-598-5263', bfp: '0929-614-6608', rescue: '0919-099-0378' },
      { name: 'Jones', pnp: '0935-136-6998', bfp: '0936-270-7515', rescue: '0906-557-4826' },
      { name: 'San Agustin', pnp: '0998-598-5267', bfp: '0935-133-9639', rescue: '0916-609-9088' },
      { name: 'Santiago City', pnp: '0917-840-6374', bfp: '0917-500-8535', rescue: '0905-558-6669' },
      // District 5
      { name: 'Aurora', pnp: '0917-147-3463', bfp: '0936-870-7654', rescue: '0917-539-7151' },
      { name: 'Burgos', pnp: '0915-727-1471', bfp: '0953-291-4596', rescue: '0926-610-5982' },
      { name: 'Luna', pnp: '0915-668-1499', bfp: '0917-506-5840', rescue: '0915-532-1605' },
      { name: 'Mallig', pnp: '0945-745-2028', bfp: '0975-661-9366', rescue: '0939-978-1158' },
      { name: 'Quezon', pnp: '0906-513-1703', bfp: '0917-309-2580', rescue: '0975-769-8851' },
      { name: 'Quirino (Isabela)', pnp: '0916-338-4207', bfp: '0927-703-1904', rescue: '0917-112-4429' },
      { name: 'Roxas', pnp: '0915-841-4988', bfp: '0935-935-1067', rescue: '0917-624-8898' },
      { name: 'San Manuel', pnp: '0935-727-6812', bfp: '0976-269-9214', rescue: '0935-763-2231' },
      // District 6
      { name: 'Cauayan City', pnp: '0926-618-5717', bfp: '0926-490-5075', rescue: '0927-716-9220' },
      { name: 'Echague', pnp: '0917-681-6913', bfp: '0917-500-2585', rescue: '0917-626-2352' },
      { name: 'San Guillermo', pnp: '0926-475-8526', bfp: '0906-821-0039', rescue: '0967-304-7100' },
      { name: 'San Isidro', pnp: '0977-309-9391', bfp: '0945-795-3299', rescue: '0926-943-0427' },
    ],
  },

  /* ============ NUEVA VIZCAYA ============ */
  {
    province: 'Nueva Vizcaya',
    provincial: {
      pnp: '078 362-0375 / 0917-540-5290',
      bfp: '(078) 321-2175',
      pdrrmo: '0917-122-7150',
    },
    municipalities: [
      { name: 'Bayombong (Capital)', pnp: '078 321-2629 / 0998-967-3130', bfp: '(078) 321-2175', rescue: '0917-658-4579' },
      { name: 'Solano', pnp: '078 326-7489 / 0927-400-8033', bfp: '0936-062-0305', rescue: '0926-383-3744' },
      { name: 'Bagabag', pnp: '078 322-2499 / 0998-967-3128', bfp: '—', rescue: '—' },
      { name: 'Bambang', pnp: '078 803-0998 / 0998-967-3129', bfp: '—', rescue: '—' },
      { name: 'Aritao', pnp: '078 322-1030 / 0998-967-3127', bfp: '—', rescue: '—' },
      { name: 'Dupax del Norte', pnp: '078 808-0238 / 0998-967-3134', bfp: '—', rescue: '—' },
      { name: 'Dupax del Sur', pnp: '0927-776-4964 / 0998-967-3135', bfp: '—', rescue: '—' },
      { name: 'Alfonso Castañeda', pnp: '0998-967-3125', bfp: '—', rescue: '—' },
      { name: 'Ambaguio', pnp: '0906-167-5646 / 0998-967-3126', bfp: '—', rescue: '—' },
      { name: 'Diadi', pnp: '0915-836-8320 / 0998-967-3132', bfp: '—', rescue: '—' },
      { name: 'Kasibu', pnp: '0905-491-7271 / 0998-967-3136', bfp: '—', rescue: '—' },
      { name: 'Kayapa', pnp: '0926-197-6470', bfp: '—', rescue: '—' },
      { name: 'Quezon', pnp: '0917-450-8222', bfp: '—', rescue: '—' },
      { name: 'Santa Fe', pnp: '0998-967-3138', bfp: '—', rescue: '—' },
      { name: 'Villaverde', pnp: '0905-123-2500', bfp: '—', rescue: '—' },
    ],
  },

  /* ============ QUIRINO ============ */
  {
    province: 'Quirino',
    provincial: {
      pnp: '0998-967-3140',
      bfp: '0917-179-2891',
      pdrrmo: '0975-415-8508',
      other: [
        { label: 'QPMC', number: '0916-525-1984' },
        { label: 'Red Cross', number: '0917-595-8090' },
      ],
    },
    municipalities: [
      { name: 'Cabarroguis (Capital)', pnp: '0917-503-9416', bfp: '0936-477-1533', rescue: '0917-152-5089' },
      { name: 'Diffun', pnp: '0998-967-3143', bfp: '—', rescue: '0977-406-5702' },
      { name: 'Saguday', pnp: '0998-967-3146', bfp: '—', rescue: '0947-894-0254' },
      { name: 'Aglipay', pnp: '0926-828-0565 / 0998-967-3144', bfp: '—', rescue: '—' },
      { name: 'Maddela', pnp: '0998-967-3145', bfp: '—', rescue: '0966-259-5691' },
      { name: 'Nagtipunan', pnp: '0998-967-3147', bfp: '—', rescue: '0927-073-1130' },
    ],
  },

  /* ============ BATANES ============ */
  {
    province: 'Batanes',
    provincial: {
      pnp: '0946-539-4015 / 0915-848-7654',
      bfp: '0921-765-0030',
      pdrrmo: '0998-564-2355',
    },
    municipalities: [
      { name: 'Basco (Capital)', pnp: '0939-198-7887', bfp: '0921-765-0030 / 0915-048-4585', rescue: '0999-990-7567',
        other: [{ label: 'Coast Guard', number: '0917-806-1514' }] },
      { name: 'Itbayat', pnp: '0929-523-4606', bfp: '—', rescue: '0920-977-4213' },
      { name: 'Ivana', pnp: '0919-985-4733', bfp: '—', rescue: '—' },
      { name: 'Mahatao', pnp: '0999-363-5871', bfp: '0912-379-0645', rescue: '—' },
      { name: 'Sabtang', pnp: '0939-387-5073', bfp: '—', rescue: '—' },
      { name: 'Uyugan', pnp: '0929-595-7149', bfp: '—', rescue: '—' },
    ],
  },
]

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
