/**
 * LGU (Local Government Unit) Directory
 *
 * Philippines-ready municipality registry for Region 2 — Cagayan Valley.
 *
 * MIGRATION PLAN (Phase 9 — NOT ACTIVATED):
 * When ready for national rollout, this hardcoded list should be migrated to
 * a Supabase `lgu_directory` table with columns:
 *   - id (uuid, PK)
 *   - slug (text, unique) — e.g. 'tuguegarao'
 *   - name (text) — display name
 *   - province (text)
 *   - region (text)
 *   - dispatch_phone (text, nullable)
 *   - status ('active' | 'onboarding' | 'offline')
 *   - latitude (float, nullable) — for geo-routing
 *   - longitude (float, nullable)
 *   - organization_id (uuid, FK → organizations) — links to tenant
 *   - created_at, updated_at
 *
 * The transfer modal in dispatch/page.tsx should then query this table
 * instead of importing from here.
 *
 * DO NOT activate automatic geo-routing (nearest-municipality) until
 * all target LGUs have active tenants with dispatch staff.
 */

export type Municipality = {
  id: string
  name: string
  province: string
  region: string
  dispatch_phone?: string
  status: 'active' | 'onboarding' | 'offline'
}

// Region 2 — Cagayan Valley Municipality Registry
// 5 Provinces: Batanes, Cagayan, Isabela, Nueva Vizcaya, Quirino
// 4 Cities + 89 Municipalities = 93 LGUs total
export const MUNICIPALITY_REGISTRY: Municipality[] = [
  // === CAGAYAN PROVINCE (1 city + 28 municipalities) ===
  { id: 'tuguegarao', name: 'Tuguegarao City', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 844 0000', status: 'active' },
  { id: 'aparri', name: 'Aparri', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 888 0000', status: 'active' },
  { id: 'solana', name: 'Solana', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 633 0000', status: 'active' },
  { id: 'baggao', name: 'Baggao', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 382 0000', status: 'active' },
  { id: 'gattaran', name: 'Gattaran', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'tuao', name: 'Tuao', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'amulung', name: 'Amulung', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'penablanca', name: 'Peñablanca', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'lal-lo', name: 'Lal-lo', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'enrile', name: 'Enrile', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'alcala', name: 'Alcala', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'gonzaga', name: 'Gonzaga', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'lasam', name: 'Lasam', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'abulug', name: 'Abulug', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'allacapan', name: 'Allacapan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'ballesteros', name: 'Ballesteros', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'buguey', name: 'Buguey', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'calayan', name: 'Calayan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'camalaniugan', name: 'Camalaniugan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'claveria', name: 'Claveria', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'iguig', name: 'Iguig', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'pamplona-cag', name: 'Pamplona', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'piat', name: 'Piat', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'rizal-cag', name: 'Rizal', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'sanchez-mira', name: 'Sanchez-Mira', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-ana', name: 'Santa Ana', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-praxedes', name: 'Santa Praxedes', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-teresita', name: 'Santa Teresita', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santo-nino', name: 'Santo Niño', province: 'Cagayan', region: 'Region II', status: 'onboarding' },

  // === ISABELA PROVINCE (3 cities + 34 municipalities) ===
  { id: 'ilagan', name: 'Ilagan City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 622 0000', status: 'active' },
  { id: 'santiago', name: 'Santiago City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 682 0000', status: 'active' },
  { id: 'cauayan', name: 'Cauayan City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 652 0000', status: 'active' },
  { id: 'echague', name: 'Echague', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'alicia', name: 'Alicia', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'roxas-isa', name: 'Roxas', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'tumauini', name: 'Tumauini', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'cabagan', name: 'Cabagan', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'san-mateo', name: 'San Mateo', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'san-mariano', name: 'San Mariano', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'ramon', name: 'Ramon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'cordon', name: 'Cordon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'jones', name: 'Jones', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'angadanan', name: 'Angadanan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'cabatuan-isa', name: 'Cabatuan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'aurora-isa', name: 'Aurora', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'luna-isa', name: 'Luna', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'naguilian', name: 'Naguilian', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'mallig', name: 'Mallig', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'gamu', name: 'Gamu', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-manuel-isa', name: 'San Manuel', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'burgos-isa', name: 'Burgos', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'delfin-albano', name: 'Delfin Albano', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'benito-soliven', name: 'Benito Soliven', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'reina-mercedes', name: 'Reina Mercedes', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'quezon-isa', name: 'Quezon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-pablo-isa', name: 'San Pablo', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'santa-maria-isa', name: 'Santa Maria', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-guillermo', name: 'San Guillermo', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-isidro-isa', name: 'San Isidro', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-agustin', name: 'San Agustin', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'santo-tomas', name: 'Santo Tomas', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'quirino-isa', name: 'Quirino (Isabela)', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'palanan', name: 'Palanan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'divilacan', name: 'Divilacan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'dinapigue', name: 'Dinapigue', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'maconacon', name: 'Maconacon', province: 'Isabela', region: 'Region II', status: 'onboarding' },

  // === NUEVA VIZCAYA PROVINCE (15 municipalities) ===
  { id: 'bayombong', name: 'Bayombong', province: 'Nueva Vizcaya', region: 'Region II', dispatch_phone: '+63 78 321 0000', status: 'active' },
  { id: 'solano', name: 'Solano', province: 'Nueva Vizcaya', region: 'Region II', dispatch_phone: '+63 78 326 0000', status: 'active' },
  { id: 'bambang', name: 'Bambang', province: 'Nueva Vizcaya', region: 'Region II', status: 'active' },
  { id: 'aritao', name: 'Aritao', province: 'Nueva Vizcaya', region: 'Region II', status: 'active' },
  { id: 'dupax-del-sur', name: 'Dupax del Sur', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'bagabag', name: 'Bagabag', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'kayapa', name: 'Kayapa', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'kasibu', name: 'Kasibu', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'quezon-nv', name: 'Quezon', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'villaverde', name: 'Villaverde', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'ambaguio', name: 'Ambaguio', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'diadi', name: 'Diadi', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'dupax-del-norte', name: 'Dupax del Norte', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'santa-fe-nv', name: 'Santa Fe', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'alfonso-castaneda', name: 'Alfonso Castañeda', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },

  // === QUIRINO PROVINCE (6 municipalities) ===
  { id: 'cabarroguis', name: 'Cabarroguis', province: 'Quirino', region: 'Region II', dispatch_phone: '+63 78 691 0000', status: 'active' },
  { id: 'diffun', name: 'Diffun', province: 'Quirino', region: 'Region II', status: 'active' },
  { id: 'saguday', name: 'Saguday', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'aglipay', name: 'Aglipay', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'maddela', name: 'Maddela', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'nagtipunan', name: 'Nagtipunan', province: 'Quirino', region: 'Region II', status: 'onboarding' },

  // === BATANES PROVINCE (6 municipalities) ===
  { id: 'basco', name: 'Basco', province: 'Batanes', region: 'Region II', dispatch_phone: '+63 78 210 0000', status: 'active' },
  { id: 'itbayat', name: 'Itbayat', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'ivana', name: 'Ivana', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'mahatao', name: 'Mahatao', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'sabtang', name: 'Sabtang', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'uyugan', name: 'Uyugan', province: 'Batanes', region: 'Region II', status: 'onboarding' },
]

/**
 * Helper: search municipalities by name, province, or region
 */
export function searchMunicipalities(query: string): Municipality[] {
  const q = query.toLowerCase()
  return MUNICIPALITY_REGISTRY.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.province.toLowerCase().includes(q) ||
    m.region.toLowerCase().includes(q)
  )
}

/**
 * Helper: get active municipalities only
 */
export function getActiveMunicipalities(): Municipality[] {
  return MUNICIPALITY_REGISTRY.filter(m => m.status === 'active')
}

/**
 * Helper: find municipality by id
 */
export function getMunicipalityById(id: string): Municipality | undefined {
  return MUNICIPALITY_REGISTRY.find(m => m.id === id)
}
