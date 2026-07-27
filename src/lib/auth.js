// src/lib/auth.js
// -----------------------------------------------------------------------------
// SSO / role resolution for SubFinder.
// Works with Azure Easy Auth (App Service, Static Web Apps) and Azure Container
// Apps built-in authentication — all of them expose the signed-in principal at
// /.auth/me and a login endpoint at /.auth/login/aad.
//
// Roles:
//   'admin' -> full access + can add / import / edit (Luke, Lisa, Todd)
//   'hps'   -> sees ALL vendors, read-only (HPS salespeople soft launch)
//   'bu'    -> sees ONLY BU-visible vendors (plants, trucking, aggregate, dumping)
// -----------------------------------------------------------------------------

// ---- CONFIG: fill these in for your tenant ----------------------------------

// Emails that get full admin (add / import / edit). Keep lower-case.
const ADMIN_EMAILS = [
  'luke.norvid@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
  'todd.koehler@heartlandpavingpartners.com',
]

// Entra ID group object-IDs that map to a Business Unit. When a signed-in user
// is a member of one of these groups they are treated as a BU user and only see
// BU-visible vendors. Grab the object IDs from:
//   Azure Portal > Microsoft Entra ID > Groups > (group) > Object Id
// NOTE: to receive group claims you must enable "groups" in the token config of
// your app registration (Token configuration > Add groups claim).
const BU_GROUPS = {
  // '00000000-0000-0000-0000-000000000000': 'Poblocki',
  // '11111111-1111-1111-1111-111111111111': 'GSPS',
  // '22222222-2222-2222-2222-222222222222': 'ACI',
}

// Role given to an authenticated user we can't otherwise classify.
// During the HPS-only soft launch this stays 'hps' (full read, no edit).
const DEFAULT_ROLE = 'hps'

// -----------------------------------------------------------------------------

export const LOGIN_URL = '/.auth/login/aad?post_login_redirect_uri=/'
export const LOGOUT_URL = '/.auth/logout?post_logout_redirect_uri=/'

export async function fetchUser() {
  try {
    const res = await fetch('/.auth/me', { headers: { Accept: 'application/json' } })
    if (!res.ok) return { authenticated: false }
    const data = await res.json()
    const cp = Array.isArray(data) ? data[0]?.clientPrincipal : data.clientPrincipal
    if (!cp) return { authenticated: false }
    return resolvePrincipal(cp)
  } catch (e) {
    return { authenticated: false, error: String(e) }
  }
}

function resolvePrincipal(cp) {
  const email = (cp.userDetails || '').toLowerCase()
  const claims = cp.claims || []
  const roles = cp.userRoles || []
  const groupIds = claims
    .filter(c => (c.typ || c.type) === 'groups')
    .map(c => c.val || c.value)

  // Business-unit membership (first match wins)
  let bu = null
  for (const gid of groupIds) {
    if (BU_GROUPS[gid]) { bu = BU_GROUPS[gid]; break }
  }

  let role = DEFAULT_ROLE
  if (ADMIN_EMAILS.includes(email) || roles.includes('admin')) role = 'admin'
  else if (bu) role = 'bu'

  return {
    authenticated: true,
    name: getClaim(claims, 'name') || cp.userDetails || 'User',
    email,
    role,
    bu,
    raw: cp,
  }
}

function getClaim(claims, key) {
  const c = claims.find(x => {
    const t = x.typ || x.type || ''
    return t === key || t.endsWith('/' + key)
  })
  return c ? (c.val || c.value) : null
}

export function isAdmin(user) { return user?.role === 'admin' }
export function canEdit(user) { return user?.role === 'admin' }
