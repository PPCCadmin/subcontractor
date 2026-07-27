import { jitteredCoords } from './geocode.js'

export const CANONICAL_SERVICES = [
  'Milling',
  'Asphalt Plant',
  'Concrete Plant',
  'Aggregate',
  'Trucking',
  'Dumping',
  'Asphalt',
  'Concrete',
  'Sealcoat',
  'Striping',
  'Crack Fill',
  'Patching',
  'Testing'
]

const SERVICE_PATTERNS = {
  Milling: [/\bmill(ing)?\b/, /\bmills?\b/],
  'Asphalt Plant': [
    /asphalt\s*plant/,
    /own[s]?\s+(their\s+)?(own\s+)?plant/,
    /plant\s+owner/
  ],
  'Concrete Plant': [/concrete\s*plant/, /ready\s*mix/],
  // Material / hauling supplier categories that BUs are allowed to see
  Aggregate: [/aggregate/, /gravel/, /\bstone\b/, /quarry/, /sand\s*(and|&)?\s*gravel/, /\bagg\b/],
  Trucking: [/truck(ing)?/, /haul(ing|er)?/, /dump\s*truck/, /freight/, /flatbed/, /lowboy/],
  Dumping: [/landfill/, /disposal/, /tipping/, /dump\s*(site|station|fee|yard|ing\s*site)/, /recycl(e|ing)\s*(center|yard)/, /transfer\s*station/],
  Asphalt: [/asphalt/, /paving/, /blacktop/, /overlay/, /mill\s*and\s*pave/],
  Concrete: [/concrete/, /flat\s*work/, /flatwork/],
  Sealcoat: [/seal\s*coat/, /sealing/, /\bseal\b/],
  Striping: [/strip(e|ing)/, /line\s*striping/, /pavement\s*marking/],
  'Crack Fill': [/crack\s*fill/, /crackfill/, /crack\s*seal/],
  Patching: [/patch(ing|work)?/, /pothole/],
  Testing: [/testing/]
}

export function canonicalizeServices(text) {
  if (!text) return []
  const normalizedText = String(text).toLowerCase()
  const hits = []
  for (const key of CANONICAL_SERVICES) {
    for (const pattern of SERVICE_PATTERNS[key]) {
      if (pattern.test(normalizedText)) {
        hits.push(key)
        break
      }
    }
  }
  return [...new Set(hits)]
}

export function normalizeName(name) {
  if (!name) return ''
  return String(name)
    .toLowerCase()
    .replace(/[.,\-'"&]/g, ' ')
    .replace(
      /\b(llc|inc|corp|corporation|company|co|ltd|limited|the)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePhone(phone) {
  if (!phone) return ''
  return String(phone)
    .replace(/\D/g, '')
    .slice(-10)
}

export function findDuplicate(existing, candidate) {
  const existingSubs = Array.isArray(existing) ? existing : []
  const candidateName = normalizeName(candidate.companyName)
  const candidatePhone = normalizePhone(
    candidate.phone || candidate.cellPhone
  )
  const candidateCity = (candidate.city || '').toLowerCase().trim()
  const candidateState = (candidate.state || '').toUpperCase().trim()

  if (!candidateName) return null

  for (const subcontractor of existingSubs) {
    if (normalizeName(subcontractor.companyName) !== candidateName) {
      continue
    }
    const subcontractorPhone = normalizePhone(
      subcontractor.phone || subcontractor.cellPhone
    )
    const subcontractorCity = (subcontractor.city || '')
      .toLowerCase()
      .trim()
    const subcontractorState = (subcontractor.state || '')
      .toUpperCase()
      .trim()

    const samePhone =
      candidatePhone &&
      subcontractorPhone &&
      candidatePhone === subcontractorPhone
    const sameLocation =
      candidateCity &&
      candidateState &&
      candidateCity === subcontractorCity &&
      candidateState === subcontractorState

    if (samePhone || sameLocation) {
      return subcontractor
    }
  }
  return null
}

function normalizeRating(value) {
  const rating = Number(value)
  if (!Number.isFinite(rating)) return null
  return Math.min(5, Math.max(1, Math.round(rating)))
}

// Accepts 'yes'/'no'/true/false/'' and returns true / false / null
function parseTriState(value) {
  if (value === true || value === 'yes' || value === 'Yes' || value === 'TRUE' || value === 'true') return true
  if (value === false || value === 'no' || value === 'No' || value === 'FALSE' || value === 'false') return false
  return null
}

export function buildSub(raw) {
  const { lat, lng } = jitteredCoords(
    raw.state,
    `${raw.companyName}|${raw.address || ''}|${raw.city || ''}|${raw.zip || ''}`
  )
  return {
    id: crypto.randomUUID(),
    companyName: (raw.companyName || '').trim(),
    address: raw.address?.trim() || null,
    city: raw.city?.trim() || null,
    state: raw.state?.toUpperCase().trim() || null,
    zip: raw.zip?.trim() || null,
    phone: raw.phone?.trim() || null,
    email: raw.email?.trim() || null,
    contactName: raw.contactName?.trim() || null,
    position: raw.position?.trim() || null,
    cellPhone: raw.cellPhone?.trim() || null,
    website: raw.website?.trim() || null,
    servicesRaw: raw.servicesRaw?.trim() || null,
    canonicalServices: raw.canonicalServices?.length
      ? raw.canonicalServices
      : canonicalizeServices(
          `${raw.servicesRaw || ''} ${raw.notes || ''}`
        ),
    notes: raw.notes?.trim() || null,
    status: raw.status || 'New',
    businessStructure: raw.businessStructure || null,
    contacts: raw.contactName
      ? [
          {
            id: crypto.randomUUID(),
            name: raw.contactName,
            role: raw.position || 'Other',
            phone: raw.phone || null,
            cellPhone: raw.cellPhone || null,
            email: raw.email || null
          }
        ]
      : [],
    equipment: [],
    licenses: [],
    projectScales: [],
    attachments: [],
    coiGL: null,
    coiAuto: null,
    coiWC: null,
    w9OnFile: parseTriState(raw.w9OnFile) === true,
    coiOnFile: parseTriState(raw.coiOnFile) === true,
    msaStatus: false,
    msaEffectiveDate: null,
    rating: normalizeRating(raw.rating),
    metroRegion: null,
    areaCovered: null,
    // null = auto-derive visibility from service category
    visibleToBUs: parseTriState(raw.visibleToBUs),
    lat,
    lng
  }
}

export const CSV_TEMPLATE_HEADERS = [
  'companyName',
  'address',
  'city',
  'state',
  'zip',
  'phone',
  'cellPhone',
  'email',
  'contactName',
  'position',
  'website',
  'servicesRaw',
  'notes',
  'status',
  'rating',
  'visibleToBUs'
]

export function downloadCsvTemplate() {
  const headers = CSV_TEMPLATE_HEADERS.join(',')
  const example = [
    'ABC Trucking Inc.',
    '123 Main St',
    'Milwaukee',
    'WI',
    '53202',
    '414-555-1234',
    '414-555-5678',
    'dispatch@abctrucking.com',
    'Jane Doe',
    'Owner',
    'https://abctrucking.com',
    'Trucking, Aggregate',
    'National hauling broker',
    'Vetted',
    '4',
    'yes'
  ]
    .map(value => `"${String(value).replace(/"/g, '""')}"`)
    .join(',')
  const csv = `${headers}\n${example}\n`
  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hpp-subs-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}
