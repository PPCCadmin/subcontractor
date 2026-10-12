// server/auth.js
// -----------------------------------------------------------------------------
// Who is signed in, and who may create / edit subcontractors.
//
// Azure Container Apps authentication (Easy Auth) signs the user in before any
// request reaches this server and passes their identity in the
// X-MS-CLIENT-PRINCIPAL header (it strips any copy the browser sends). This
// server is the only place edit access is enforced; the browser just hides
// buttons.
// -----------------------------------------------------------------------------

// ---- CONFIG: who can create and edit subcontractors -------------------------

// Emails allowed to add / import / edit / rate subcontractors. Keep lower-case.
// Extra emails can also be added without a code change through the ADMIN_EMAILS
// environment variable (comma-separated) on the container app.
const ADMIN_EMAILS = [
  'luke.norvid@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
  'todd.koehler@heartlandpavingpartners.com',
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

export function getUser(req) {
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

  email = email.trim().toLowerCase()
  if (!email) return { authenticated: false, email: '', name: 'Guest', role: 'hps', roles: [] }

  const admin = ADMIN_EMAILS.includes(email) || roles.some(role => ADMIN_APP_ROLES.includes(role))
  return { authenticated: true, email, name: name || email, role: admin ? 'admin' : 'hps', roles }
}

export function requireAdmin(req, res, next) {
  const user = getUser(req)
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admins can make changes.' })
  req.user = user
  next()
}
