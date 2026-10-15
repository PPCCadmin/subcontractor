import { getSubs } from './lib/api.js'

const LS_KEY_PROJECTS = 'hpp-projects-v2'

function normalizedServices(sub) {
  const services = [...new Set((sub.canonicalServices || []).filter(Boolean))]
  const raw = String(sub.servicesRaw || '')
  const name = String(sub.companyName || '')
  const combined = `${raw} ${name}`
  const sealcoatVariant = /\b(seal\s*coat(?:ing)?|sealcaot(?:ing)?|selacoat(?:ing)?|sealcaoting)\b/i

  if (sealcoatVariant.test(combined) && !services.includes('Sealcoat Suppliers') && !services.includes('Sealcoat')) {
    services.push('Sealcoat')
  }

  const testingProvider = /\btesting\b/i.test(name) || /^\s*testing\s*$/i.test(raw)
  if (testingProvider && !services.includes('Testing')) services.push('Testing')

  return services
}

export function migrate(sub) {
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
  if (status === 'Do Not Use') status = 'DNU'
  if (status === 'Unknown' || status === 'Competitor' || !status) status = 'New'

  const normalized = normalizedServices(sub)
  if (normalized.includes('Testing') && status !== 'DNU') status = 'Vetted'

  return {
    ...sub,
    status,
    canonicalServices: normalized,
    businessStructure: sub.businessStructure || null,
    contacts,
    contactName2: sub.contactName2 ?? null,
    position2: sub.position2 ?? null,
    cellPhone2: sub.cellPhone2 ?? null,
    email2: sub.email2 ?? null,
    equipment: sub.equipment || [],
    licenses: sub.licenses || [],
    projectScales: sub.projectScales || [],
    attachments: (sub.attachments || []).filter(file => file.type !== 'COI'),
    visibleToBUs: sub.visibleToBUs ?? null,
    serviceDelivery: sub.serviceDelivery || {},
    ratings: sub.ratings || (sub.rating ? [{ id: `imported-${sub.id}`, stars: sub.rating, byEmail: '', byName: 'Imported rating', comment: '', date: null }] : []),
    locationAccuracy: sub.locationAccuracy || (sub.lat != null && sub.lng != null ? 'exact' : 'unknown'),
  }
}

// Loads every subcontractor (seed data merged with saved edits) from the server.
// Returns { subs, saving } where saving is false until server storage is set up.
export async function loadSubs() {
  for (let version = 1; version <= 18; version += 1) {
    localStorage.removeItem(`hpp-subs-v${version}`)
  }
  localStorage.removeItem('hpp-rfqs-v2')

  const data = await getSubs()
  if (!Array.isArray(data.subs)) throw new Error('Server did not return a subcontractor list')
  return { subs: data.subs.map(migrate), saving: Boolean(data.saving) }
}

export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_PROJECTS) || '[]') } catch { return [] }
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

// Whether a subcontractor does a service with their own crews or subs it out.
// Stored per service in sub.serviceDelivery, e.g. { Milling: 'self', Striping: 'subs' };
// a service with no entry is not known yet.
export const SERVICE_DELIVERY = [
  { key: 'self', label: 'Self-performs' },
  { key: 'subs', label: 'Subs out' },
]

export function serviceDelivery(sub, service) {
  return sub.serviceDelivery?.[service] || null
}

export const BUSINESS_STRUCTURES = ['LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietor', 'Other']
export const CONTACT_ROLES = ['Owner', 'Estimator', 'Accounting', 'Field Operations', 'Project Manager', 'Sales', 'Other']
export const PROJECT_SCALES = ['< $20k', '$20k–$100k', '$100k–$300k', 'Capital (> $300k)']
export const EQUIPMENT_TYPES = ['Paver', 'Mill', 'Roller', 'Distributor', 'Sweeper', 'Sealcoat Rig', 'Striper', 'Concrete Plant', 'Asphalt Plant', 'Truck', 'Other']
export const LICENSE_TYPES = ['General Contractor', 'Paving', 'Concrete', 'DOT', 'State-Specific', 'Other']
export const ATTACHMENT_TYPES = ['W-9', 'MSA', 'Contract', 'License', 'Quote', 'Repair Map', 'Mix Design', 'Other']
export const STATUSES = [
  { key: 'Vetted', label: 'Vetted', color: '#1a5c38' },
  { key: 'Recommended', label: 'Recommended', color: '#ca8a04' },
  { key: 'New', label: 'New', color: '#2563eb' },
  { key: 'DNU', label: 'DNU', color: '#dc2626' },
]

export function statusColor(status) {
  return STATUSES.find(item => item.key === status)?.color || '#6b7280'
}
