// server/access.js
// -----------------------------------------------------------------------------
// The access list managed in the Admin tab: who may use SubFinder, which
// business units each person sees, and who is an admin. Stored as one settings
// document ("access") in storage:
//
//   {
//     radiusMiles: 200,
//     users: [{ email, name, admin, allBusinessUnits, businessUnits: ['poblocki'] }],
//     updatedAt, updatedBy
//   }
//
// Anyone not on the list (and not an emergency admin, see auth.js) has no access.
// -----------------------------------------------------------------------------

import { ConflictError } from './store.js'
import { BUSINESS_UNITS, DEFAULT_RADIUS_MILES, businessUnit } from './businessUnits.js'

const DOC = 'access'
const SCHEMA = 2

// The first admins. They start on the list as regular, editable admins.
const STARTING_ADMINS = [
  'luke.norvid@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
  'todd.koehler@heartlandpavingpartners.com',
  'ron.repking@heartlandpavingpartners.com',
]
const CACHE_MS = 30 * 1000
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export class AccessValidationError extends Error {}

const emptyAccess = () => ({ radiusMiles: DEFAULT_RADIUS_MILES, users: [] })

// Lists saved before admins became editable didn't include the original
// admins (they were hard-coded), so add them back as editable admins.
function withStartingAdmins(value) {
  if (value.schema === SCHEMA) return value
  const listed = new Set(value.users.map(user => user.email))
  const added = STARTING_ADMINS.filter(email => !listed.has(email))
    .map(email => ({ email, name: '', admin: true, allBusinessUnits: true, businessUnits: [] }))
  return { ...value, users: [...added, ...value.users] }
}

export function createAccess(getStore) {
  let cache = null

  // Fails closed: if the list can't be read, only the starting and emergency
  // admins get in.
  async function load({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.doc
    const store = getStore()
    if (!store) return { value: withStartingAdmins(emptyAccess()), etag: null, unavailable: true }
    try {
      const doc = (await store.getDoc(DOC)) || { value: emptyAccess(), etag: null }
      doc.value = withStartingAdmins({ ...emptyAccess(), ...doc.value })
      cache = { at: Date.now(), doc }
      return doc
    } catch (error) {
      console.error('Loading access list failed:', error?.code || error?.statusCode || error?.message)
      return { value: withStartingAdmins(emptyAccess()), etag: null, unavailable: true }
    }
  }

  async function lookup(email) {
    const { value } = await load()
    const entry = value.users.find(user => user.email === email) || null
    return { entry, radiusMiles: value.radiusMiles }
  }

  // Replaces the whole list. `version` is the etag the admin loaded, so two
  // admins editing at once can't silently overwrite each other.
  // editor: { email, emergency } - emergency admins may change anything.
  async function save({ users, radiusMiles }, version, editor) {
    const store = getStore()
    const value = {
      schema: SCHEMA,
      radiusMiles: validRadius(radiusMiles),
      users: validUsers(users),
      updatedAt: new Date().toISOString(),
      updatedBy: editor.email,
    }
    // Guard against locking everyone out.
    if (!value.users.some(user => user.admin)) throw new AccessValidationError('Keep at least one admin on the list.')
    if (!editor.emergency && !value.users.some(user => user.email === editor.email && user.admin)) {
      throw new AccessValidationError("You can't remove your own admin access. Ask another admin to do it.")
    }
    try {
      await store.putDoc(DOC, value, version || null)
    } catch (error) {
      if (error instanceof ConflictError) throw new ConflictError('Someone else changed the access list. Reload the Admin tab to see their changes, then try again.')
      throw error
    }
    cache = null
    return load({ fresh: true })
  }

  return { load, lookup, save }
}

function validRadius(value) {
  const miles = Number(value)
  if (!Number.isFinite(miles) || miles < 1 || miles > 3000) throw new AccessValidationError('Radius must be between 1 and 3000 miles.')
  return Math.round(miles)
}

function validUsers(users) {
  if (!Array.isArray(users)) throw new AccessValidationError('Users list is missing.')
  const seen = new Set()
  return users.map(raw => {
    const email = String(raw?.email || '').trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) throw new AccessValidationError(`"${raw?.email || ''}" is not a valid email address.`)
    if (seen.has(email)) throw new AccessValidationError(`${email} is listed twice.`)
    seen.add(email)
    const admin = Boolean(raw.admin)
    const allBusinessUnits = admin || Boolean(raw.allBusinessUnits)
    const businessUnits = [...new Set((raw.businessUnits || []).filter(key => businessUnit(key)))]
    return {
      email,
      name: String(raw.name || '').trim().slice(0, 120),
      admin,
      allBusinessUnits,
      businessUnits: allBusinessUnits ? [] : businessUnits,
    }
  })
}

export { BUSINESS_UNITS }
