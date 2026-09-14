const LS_KEY = 'hpp-subs-v16'
const LS_KEY_RFQS = 'hpp-rfqs-v2'
const LS_KEY_PROJECTS = 'hpp-projects-v2'

function normalizedServices(sub) {
  const services = [...new Set((sub.canonicalServices || []).filter(Boolean))]
  const raw = String(sub.servicesRaw || '')
  const name = String(sub.companyName || '')
  const combined = `${raw} ${name}`

  const sealcoatVariant = /\b(seal\s*coat(?:ing)?|sealcaot(?:ing)?|selacoat(?:ing)?|sealcaoting)\b/i

  if (
    sealcoatVariant.test(combined) &&
    !services.includes('Sealcoat Suppliers') &&
    !services.includes('Sealcoat')
  ) {
    services.push('Sealcoat')
  }

  const testingProvider =
    /\btesting\b/i.test(name) || /^\s*testing\s*$/i.test(raw)

  if (testingProvider && !services.includes('Testing')) {
    services.push('Testing')
  }

  return services
}

function migrate(sub) {
  let contacts = sub.contacts

  if (!contacts) {
    contacts = []

    if (sub.contactName) {
      contacts.push({
        id: crypto.randomUUID(),
        name: sub.contactName,
        role: sub.position || 'Other',
        phone: sub.phone,
        cellPhone: sub.cellPhone,
        email: sub.email,
      })
    }

    if (sub.contactName2) {
      contacts.push({
        id: crypto.randomUUID(),
        name: sub.contactName2,
        role: sub.position2 || 'Other',
        phone: null,
        cellPhone: sub.cellPhone2,
        email: sub.email2,
      })
    }
  }

  let status = sub.status

  if (status === 'Do Not Use') {
    status = 'DNU'
  }

  if (status === 'Unknown' || status === 'Competitor' || !status) {
    status = 'New'
  }

  const normalized = normalizedServices(sub)

  if (normalized.includes('Testing') && status !== 'DNU') {
    status = 'Vetted'
  }

  return {
    ...sub,
    status,
    canonicalServices: normalized,
    businessStructure: sub.businessStructure || null,
    contacts,
    coiOnFile: sub.coiOnFile ?? false,
    contactName2: sub.contactName2 ?? null,
    position2: sub.position2 ?? null,
    cellPhone2: sub.cellPhone2 ?? null,
    email2: sub.email2 ?? null,
    equipment: sub.equipment || [],
    licenses: sub.licenses || [],
    projectScales: sub.projectScales || [],
    attachments: sub.attachments || [],
    visibleToBUs: sub.visibleToBUs ?? null,
    locationAccuracy:
      sub.locationAccuracy ||
      (sub.lat != null && sub.lng != null ? 'exact' : 'unknown'),
  }
}

export async function loadSubs() {
  for (let version = 1; version <= 15; version += 1) {
    localStorage.removeItem(`hpp-subs-v${version}`)
  }

  const response = await fetch('/subcontractors.json?v=16', {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`Unable to load subcontractors.json (${response.status})`)
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('subcontractors.json did not return an array')
  }

  return data.map(migrate)
}

export function saveSubs() {
  // The full dataset is intentionally not saved to localStorage.
  // It exceeds the browser storage quota and is loaded from JSON instead.
}

export function loadRfqs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_RFQS) || '[]')
  } catch {
    return []
  }
}

export function saveRfqs(value) {
  localStorage.setItem(LS_KEY_RFQS, JSON.stringify(value))
}

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_PROJECTS) || '[]')
  } catch {
    return []
  }
}

export function saveProjects(value) {
  localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(value))
}

export const SERVICE_TAXONOMY = [
  'Milling',
  'Asphalt',
  'Asphalt Plant',
  'Concrete',
  'Concrete Plant',
  'Aggregate',
  'Trucking',
  'Dumping',
  'Sealcoat',
  'Sealcoat Suppliers',
  'Striping',
  'Crack Fill',
  'Patching',
  'Micro Paving',
  'Soil Stabilization',
  'Equipment Rental',
  'Testing',
]

export const BU_VISIBLE_SERVICES = [
  'Asphalt Plant',
  'Concrete Plant',
  'Aggregate',
  'Trucking',
  'Dumping',
]

export function isVisibleToBUs(sub) {
  if (sub.visibleToBUs === true) return true
  if (sub.visibleToBUs === false) return false

  const services = sub.canonicalServices || []
  return services.some(service => BU_VISIBLE_SERVICES.includes(service))
}

export function visibleSubsForRole(subs, role) {
  if (role === 'bu') {
    return subs.filter(isVisibleToBUs)
  }

  return subs
}

export const BUSINESS_STRUCTURES = [
  'LLC',
  'Corporation',
  'S-Corp',
  'Partnership',
  'Sole Proprietor',
  'Other',
]

export const CONTACT_ROLES = [
  'Owner',
  'Estimator',
  'Accounting',
  'Field Operations',
  'Project Manager',
  'Sales',
  'Other',
]

export const PROJECT_SCALES = [
  '< $20k',
  '$20k–$100k',
  '$100k–$300k',
  'Capital (> $300k)',
]

export const EQUIPMENT_TYPES = [
  'Paver',
  'Mill',
  'Roller',
  'Distributor',
  'Sweeper',
  'Sealcoat Rig',
  'Striper',
  'Concrete Plant',
  'Asphalt Plant',
  'Truck',
  'Other',
]

export const LICENSE_TYPES = [
  'General Contractor',
  'Paving',
  'Concrete',
  'DOT',
  'State-Specific',
  'Other',
]

export const ATTACHMENT_TYPES = [
  'COI',
  'W-9',
  'MSA',
  'Contract',
  'License',
  'Quote',
  'Repair Map',
  'Mix Design',
  'Other',
]

export const STATUSES = [
  { key: 'Vetted', label: 'Vetted', color: '#1a5c38' },
  { key: 'Recommended', label: 'Recommended', color: '#ca8a04' },
  { key: 'New', label: 'New', color: '#2563eb' },
  { key: 'DNU', label: 'DNU', color: '#dc2626' },
]

export function statusColor(status) {
  const match = STATUSES.find(item => item.key === status)
  return match ? match.color : '#6b7280'
}
