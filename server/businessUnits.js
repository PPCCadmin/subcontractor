// server/businessUnits.js
// -----------------------------------------------------------------------------
// Business units and their office locations. In the Admin tab, each user is
// given one or more business units and only sees subcontractors within the
// radius (also set in the Admin tab) of those offices.
// -----------------------------------------------------------------------------

export const DEFAULT_RADIUS_MILES = 200

export const BUSINESS_UNITS = [
  { key: 'poblocki', name: 'Poblocki Paving', address: '16363 West Ryerson Road, New Berlin, WI 53151', lat: 42.9887, lng: -88.1175 },
  { key: 'asi', name: 'ASI', address: '5342 South Harding Street, Indianapolis, IN 46217', lat: 39.6882, lng: -86.1872 },
  { key: 'klekamp', name: 'Klekamp', address: '4381 Creek Road, Blue Ash, OH 45241', lat: 39.2595, lng: -84.3865 },
  { key: 'macadam', name: 'Macadam', address: '26 South Bacton Hill Road, Malvern, PA 19355', lat: 40.0590, lng: -75.5470 },
  { key: 'professional', name: 'Professional Paving & Concrete', address: '1N282 Park Boulevard, Glen Ellyn, IL 60137', lat: 41.8830, lng: -88.0620 },
  { key: 'sk', name: 'S&K Asphalt and Concrete', address: '2245 Manchester Road, Akron, OH 44314', lat: 41.0377, lng: -81.5459 },
  { key: 'gsps', name: 'GSPS', address: '300 Commerce Dr Ste 1, Tinton Falls, NJ 07753', lat: 40.2352, lng: -74.1074 },
  { key: 'aci', name: 'ACI', address: '10285 89th Ave N, Osseo, MN 55369', lat: 45.1161, lng: -93.4120 },
]

const byKey = new Map(BUSINESS_UNITS.map(unit => [unit.key, unit]))

export function businessUnit(key) {
  return byKey.get(key) || null
}

// Great-circle distance in miles.
export function milesBetween(a, b) {
  const toRad = degrees => degrees * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// True when the subcontractor is within radius of any of the user's areas.
// Subcontractors with no map location can't be placed inside a radius, so
// they are left out.
export function withinAreas(sub, areas) {
  if (sub.lat == null || sub.lng == null) return false
  const point = { lat: Number(sub.lat), lng: Number(sub.lng) }
  return areas.some(area => milesBetween(area, point) <= area.radiusMiles)
}
