// server/offices.js
// -----------------------------------------------------------------------------
// Which subcontractors each company's users can see.
//
// A user's email domain picks their company office; they only see
// subcontractors within OFFICE_RADIUS_MILES of it. Admins (server/auth.js) and
// Heartland corporate users see everything. Anyone whose domain is not listed
// here sees nothing.
// -----------------------------------------------------------------------------

// Default radius; override with the OFFICE_RADIUS_MILES environment variable.
export const OFFICE_RADIUS_MILES = Number(process.env.OFFICE_RADIUS_MILES) || 200

// Email domain -> office. lat/lng are the office address.
const OFFICES = {
  'poblockipaving.com': { name: 'Poblocki Paving', address: '16363 West Ryerson Road, New Berlin, WI 53151', lat: 42.9887, lng: -88.1175 },
  'asindy.com': { name: 'ASI', address: '5342 South Harding Street, Indianapolis, IN 46217', lat: 39.6882, lng: -86.1872 },
  'klekamp.com': { name: 'Klekamp', address: '4381 Creek Road, Blue Ash, OH 45241', lat: 39.2595, lng: -84.3865 },
  'macadam.com': { name: 'Macadam', address: '26 South Bacton Hill Road, Malvern, PA 19355', lat: 40.0590, lng: -75.5470 },
  'wepavetheway.com': { name: 'Professional Paving & Concrete', address: '1N282 Park Boulevard, Glen Ellyn, IL 60137', lat: 41.8830, lng: -88.0620 },
  'skasphaltconcrete.com': { name: 'S&K Asphalt and Concrete', address: '2245 Manchester Road, Akron, OH 44314', lat: 41.0377, lng: -81.5459 },
}

// Heartland corporate domains: see every subcontractor (read-only unless admin).
const CORPORATE_DOMAINS = ['heartlandpavingpartners.com', 'heartlandpavingsolutions.com']

export function officeForEmail(email) {
  const domain = String(email || '').split('@')[1] || ''
  const office = OFFICES[domain]
  return office ? { ...office, domain, radiusMiles: OFFICE_RADIUS_MILES } : null
}

export function isCorporateEmail(email) {
  return CORPORATE_DOMAINS.includes(String(email || '').split('@')[1] || '')
}

// Great-circle distance in miles.
export function milesBetween(a, b) {
  const toRad = degrees => degrees * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// Subcontractors with no map location can't be placed inside a radius, so
// office users don't see them.
export function withinOffice(sub, office) {
  if (sub.lat == null || sub.lng == null) return false
  return milesBetween(office, { lat: Number(sub.lat), lng: Number(sub.lng) }) <= office.radiusMiles
}
