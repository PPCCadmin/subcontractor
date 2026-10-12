// src/lib/auth.js
// -----------------------------------------------------------------------------
// SSO / role resolution for SubFinder.
// Works with Azure Easy Auth (App Service, Static Web Apps) and Azure Container
// Apps built-in authentication — all of them expose the signed-in principal at
// /.auth/me and a login endpoint at /.auth/login/aad.
//
// Roles:
//   'admin' -> can add / import / edit subcontractors (only the users below)
//   'hps'   -> sees ALL vendors, read-only (everyone else who signs in)
//   'bu'    -> sees ONLY BU-visible vendors (plants, trucking, aggregate, dumping)
// -----------------------------------------------------------------------------

// ---- CONFIG: who can create and edit subcontractors -------------------------

// Emails allowed to add / import / edit subcontractors. This is the ONLY list
// that grants edit access — everyone else is read-only. Keep lower-case.
const ADMIN_EMAILS = [
  'luke.norvid@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
  'todd.koehler@heartlandpavingpartners.com',
]

// Optional: Entra ID app roles that also grant edit access. To use, create an
// app role with one of these values on the app registration, then assign users
// under Enterprise applications > (app) > Users and groups.
const ADMIN_APP_ROLES = ['SubcontractorEditor']

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
const DEFAULT_ROLE = 'hps'

// -----------------------------------------------------------------------------

export const LOGIN_URL = '/.auth/login/aad?post_login_redirect_uri=/'
export const LOGOUT_URL = '/.auth/logout?post_logout_redirect_uri=/'

export const READ_ONLY_USER = {
  authenticated: true,
  name: 'HPP User',
  email: '',
  role: DEFAULT_ROLE,
  bu: null,
  roles: [],
}

const ROLE_CLAIM_TYPES = ['roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
const EMAIL_CLAIM_TYPES = ['preferred_username', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'emails']
const NAME_CLAIM_TYPES = ['name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']

// Reads /.auth/me and returns the signed-in user with a resolved role. Any
// failure falls back to a read-only user, never to an editor.
export async function fetchUser() {
  // Local dev only (stripped from production builds): there is no /.auth/me on
  // localhost, so `localStorage.setItem('dev-user-email', '<email>')` and reload
  // to preview the app as that user.
  if (import.meta.env.DEV) {
    const devEmail = localStorage.getItem('dev-user-email')
    if (devEmail) return resolvePrincipal([{ user_name: devEmail, user_claims: [{ typ: 'name', val: `${devEmail} (local)` }] }])
  }
  try {
    const response = await fetch('/.auth/me', { credentials: 'include', cache: 'no-store', redirect: 'manual' })
    if (!response.ok) throw new Error(`Authentication check failed: ${response.status}`)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) throw new Error('Easy Auth identity endpoint did not return JSON')
    return resolvePrincipal(await response.json())
  } catch (error) {
    console.warn('Unable to read Easy Auth identity:', error)
    return READ_ONLY_USER
  }
}

// Handles both shapes: Container Apps / App Service return an array with
// user_name + user_claims; Static Web Apps return { clientPrincipal }.
function resolvePrincipal(data) {
  const containerPrincipal = Array.isArray(data) ? data[0] : null
  const staticPrincipal = data?.clientPrincipal || null
  if (!containerPrincipal && !staticPrincipal) return READ_ONLY_USER

  const containerClaims = containerPrincipal?.user_claims || []
  const staticClaims = staticPrincipal?.claims || []
  const claims = containerClaims.length ? containerClaims : staticClaims

  const email = String(
    containerPrincipal?.user_name ||
    staticPrincipal?.userDetails ||
    claimValues(claims, EMAIL_CLAIM_TYPES)[0] ||
    ''
  ).trim().toLowerCase()

  const roles = [
    ...(staticPrincipal?.userRoles || []),
    ...(containerPrincipal?.user_roles || []),
    ...claimValues(claims, ROLE_CLAIM_TYPES),
  ]
  const groupIds = claimValues(claims, ['groups'])

  // Business-unit membership (first match wins)
  const bu = groupIds.map(gid => BU_GROUPS[gid]).find(Boolean) || null

  let role = DEFAULT_ROLE
  if (isAdminIdentity(email, roles)) role = 'admin'
  else if (bu) role = 'bu'

  return {
    authenticated: true,
    name: claimValues(claims, NAME_CLAIM_TYPES)[0] || email || 'HPP User',
    email,
    role,
    bu,
    roles,
  }
}

function isAdminIdentity(email, roles) {
  if (email && ADMIN_EMAILS.includes(email)) return true
  return roles.some(role => ADMIN_APP_ROLES.includes(role))
}

function claimValues(claims, types) {
  return claims
    .filter(claim => types.includes(claim.typ || claim.type))
    .map(claim => claim.val || claim.value)
    .filter(Boolean)
}

export function isAdmin(user) { return user?.role === 'admin' }
export function canEdit(user) { return user?.role === 'admin' }
