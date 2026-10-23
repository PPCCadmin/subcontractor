// server/auth.js
// -----------------------------------------------------------------------------
// Who is signed in, what they may see, and who may make changes.
//
// Azure Container Apps authentication (Easy Auth) signs the user in before any
// request reaches this server and passes their identity in the
// X-MS-CLIENT-PRINCIPAL header (it strips any copy the browser sends). This
// server is the only place edit access is enforced; the browser just hides
// buttons.
// -----------------------------------------------------------------------------

import { businessUnit } from './businessUnits.js'

// ---- CONFIG: built-in admins ------------------------------------------------

// Built-in admins always have full access and can't be removed in the Admin
// tab, so nobody can lock everyone out. Everyone else is managed in the Admin
// tab. Extra built-in admins can be added through the ADMIN_EMAILS environment
// variable (comma-separated) on the container app. Keep lower-case.
export const BUILT_IN_ADMINS = [
  'luke.norvid@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
  'todd.koehler@heartlandpavingpartners.com',
  'ron.repking@heartlandpavingpartners.com',
  ...String(process.env.ADMIN_EMAILS || '').split(','),
].map(email => email.trim().toLowerCase()).filter(Boolean)

// Optional: Entra ID app roles that also grant edit access. Create an app role
// with this value on the app registration, then assign users under
// Enterprise applications > (app) > Users and groups.
const ADMIN_APP_ROLES = ['SubcontractorEditor']

// -----------------------------------------------------------------------------

const EMAIL_CLAIMS = ['preferred_username', 'email', 'upn', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn']
const NAME_CLAIMS = ['name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
const ROLE_CLAIMS = ['roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

const isProduction = process.env.NODE_ENV === 'production'

function identity(req) {
  let email = ''
  let name = ''
  let roles = []

  const header = req.get('x-ms-client-principal')
  if (header) {
    try {
      const principal = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
      const claims = principal.claims || []
      const values = types => claims.filter(c => types.includes(c.typ)).map(c => c.val).filter(Boolean)
      email = values(EMAIL_CLAIMS)[0] || ''
      name = values(NAME_CLAIMS)[0] || ''
      roles = values(ROLE_CLAIMS)
    } catch {
      // fall through to the plain-name header
    }
  }
  if (!email) email = req.get('x-ms-client-principal-name') || ''

  // Local development only: there is no Easy Auth on localhost.
  if (!isProduction && !email && req.get('x-dev-user')) {
    email = req.get('x-dev-user')
    name = `${email} (local)`
  }

  return { email: email.trim().toLowerCase(), name, roles }
}

// Roles:
//   admin  -> sees every subcontractor, can add / edit / rate, runs the Admin tab
//   viewer -> read-only; sees all business units or only the ones assigned
//   none   -> not on the access list (or no business units yet), sees nothing
export function createAuth(access) {
  async function getUser(req) {
    const { email, name, roles } = identity(req)
    if (!email) return { authenticated: false, email: '', name: 'Guest', role: 'none', allBusinessUnits: false, areas: [] }
    const base = { authenticated: true, email, name: name || email }

    const builtIn = BUILT_IN_ADMINS.includes(email) || roles.some(role => ADMIN_APP_ROLES.includes(role))
    const { entry, radiusMiles } = await access.lookup(email)
    if (builtIn || entry?.admin) return { ...base, role: 'admin', builtInAdmin: builtIn, allBusinessUnits: true, areas: [] }
    if (!entry) return { ...base, role: 'none', reason: 'not-listed', allBusinessUnits: false, areas: [] }
    if (entry.allBusinessUnits) return { ...base, role: 'viewer', allBusinessUnits: true, areas: [] }

    const areas = entry.businessUnits.map(businessUnit).filter(Boolean).map(unit => ({ ...unit, radiusMiles }))
    if (!areas.length) return { ...base, role: 'none', reason: 'no-business-units', allBusinessUnits: false, areas: [] }
    return { ...base, role: 'viewer', allBusinessUnits: false, areas }
  }

  async function requireAdmin(req, res, next) {
    try {
      const user = await getUser(req)
      if (user.role !== 'admin') return res.status(403).json({ error: 'Only admins can make changes.' })
      req.user = user
      next()
    } catch (error) {
      next(error)
    }
  }

  return { getUser, requireAdmin }
}
