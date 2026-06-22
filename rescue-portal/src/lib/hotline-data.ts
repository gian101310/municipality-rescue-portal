/* ------------------------------------------------------------------ */
/*  REGION 2 – CAGAYAN VALLEY EMERGENCY HOTLINES DATA                  */
/*  Shared between public /emergency-hotlines and admin /admin/hotlines */
/* ------------------------------------------------------------------ */

export type Agency = {
  name: string
  pnp?: string
  bfp?: string
  rescue?: string // MDRRMO / LGU Rescue
  other?: { label: string; number: string }[]
}

export type ProvinceData = {
  province: string
  provincial: {
    pnp?: string
    bfp?: string
    pdrrmo?: string
    other?: { label: string; number: string }[]
  }
  municipalities: Agency[]
}

export const REGION_HOTLINES = {
  pro2: '(078) 304-0074 / (078) 304-2897',
  pro2_opcen: '0917-564-4974',
  national_emergency: '911',
  pnp_hotline: '8722-0650 / 117',
  bfp_hotline: '(02) 8426-0219 / (02) 8426-0246',
  red_cross: '143',
}

export const PROVINCES: ProvinceData[] = [
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
      { name: 'Cabagan', pnp: '0917-904-0181', bfp: '0936-748-8367', rescue: '0966-132-9009' },
      { name: 'Delfin Albano', pnp: '0977-801-9029', bfp: '0926-803-9466', rescue: '0917-653-3652' },
      { name: 'Divilacan', pnp: '0998-967-3088', bfp: '0946-425-4045', rescue: '0963-604-0286' },
      { name: 'City of Ilagan', pnp: '0917-145-5432', bfp: '0953-056-3939', rescue: '0915-234-1124' },
      { name: 'Maconacon', pnp: '0998-598-5234', bfp: '0920-386-8320', rescue: '0981-406-1703' },
      { name: 'San Pablo', pnp: '0998-598-5238', bfp: '0917-105-5336', rescue: '0917-577-9400' },
      { name: 'Santa Maria', pnp: '0905-680-0334', bfp: '0967-552-2866', rescue: '0939-714-3487' },
      { name: 'Santo Tomas', pnp: '0998-598-5237', bfp: '0905-044-6665', rescue: '0975-052-8519' },
      { name: 'Tumauini', pnp: '0998-598-5239', bfp: '0915-196-0342', rescue: '0999-655-2011' },
      { name: 'Benito Soliven', pnp: '0917-508-2945', bfp: '0916-894-2182', rescue: '0966-783-3357' },
      { name: 'Gamu', pnp: '0927-939-6862', bfp: '0935-458-1525', rescue: '0927-128-7232' },
      { name: 'Naguilian', pnp: '0998-598-5246', bfp: '0916-714-2763', rescue: '0929-460-6071' },
      { name: 'Palanan', pnp: '0917-124-1721', bfp: '0997-417-2526', rescue: '0975-463-5583' },
      { name: 'Reina Mercedes', pnp: '0935-532-8600', bfp: '0935-666-9917', rescue: '0997-609-1594' },
      { name: 'San Mariano', pnp: '0927-993-5330', bfp: '0926-500-3102', rescue: '0915-133-3320' },
      { name: 'Alicia', pnp: '0917-819-6449', bfp: '0966-935-1144', rescue: '0997-609-7679' },
      { name: 'Angadanan', pnp: '0936-971-1413', bfp: '0955-022-3236', rescue: '0927-142-8226' },
      { name: 'Cabatuan', pnp: '0915-667-0205', bfp: '0917-510-3246', rescue: '0936-947-1537' },
      { name: 'Ramon', pnp: '0998-598-5266', bfp: '0906-941-1743', rescue: '0906-713-5314' },
      { name: 'San Mateo', pnp: '0917-174-5655', bfp: '0927-824-9439', rescue: '0926-280-3804' },
      { name: 'Cordon', pnp: '0998-598-5262', bfp: '0926-946-8923', rescue: '0917-579-4645' },
      { name: 'Dinapigue', pnp: '0998-598-5263', bfp: '0929-614-6608', rescue: '0919-099-0378' },
      { name: 'Jones', pnp: '0935-136-6998', bfp: '0936-270-7515', rescue: '0906-557-4826' },
      { name: 'San Agustin', pnp: '0998-598-5267', bfp: '0935-133-9639', rescue: '0916-609-9088' },
      { name: 'Santiago City', pnp: '0917-840-6374', bfp: '0917-500-8535', rescue: '0905-558-6669' },
      { name: 'Aurora', pnp: '0917-147-3463', bfp: '0936-870-7654', rescue: '0917-539-7151' },
      { name: 'Burgos', pnp: '0915-727-1471', bfp: '0953-291-4596', rescue: '0926-610-5982' },
      { name: 'Luna', pnp: '0915-668-1499', bfp: '0917-506-5840', rescue: '0915-532-1605' },
      { name: 'Mallig', pnp: '0945-745-2028', bfp: '0975-661-9366', rescue: '0939-978-1158' },
      { name: 'Quezon', pnp: '0906-513-1703', bfp: '0917-309-2580', rescue: '0975-769-8851' },
      { name: 'Quirino (Isabela)', pnp: '0916-338-4207', bfp: '0927-703-1904', rescue: '0917-112-4429' },
      { name: 'Roxas', pnp: '0915-841-4988', bfp: '0935-935-1067', rescue: '0917-624-8898' },
      { name: 'San Manuel', pnp: '0935-727-6812', bfp: '0976-269-9214', rescue: '0935-763-2231' },
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
