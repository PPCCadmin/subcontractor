// src/lib/auth.js
// -----------------------------------------------------------------------------
// Who is signed in. The server (server/auth.js) holds the admin list and
// enforces it on every change; the browser only uses the role to show or hide
// editing controls.
//
// Roles:
//   'admin' -> can add / import / edit / rate subcontractors
//   'hps'   -> sees ALL vendors, read-only
//   'bu'    -> sees ONLY BU-visible vendors (plants, trucking, aggregate, dumping)
// -----------------------------------------------------------------------------

import { getMe } from './api.js'

export const LOGIN_URL = '/.auth/login/aad?post_login_redirect_uri=/'
export const LOGOUT_URL = '/.auth/logout?post_logout_redirect_uri=/'

export const READ_ONLY_USER = {
  authenticated: true,
  name: 'HPP User',
  email: '',
  role: 'hps',
  bu: null,
  roles: [],
}

// Any failure falls back to a read-only user, never to an editor.
export async function fetchUser() {
  try {
    const me = await getMe()
    if (!me.authenticated) return READ_ONLY_USER
    return { ...READ_ONLY_USER, ...me, bu: null }
  } catch (error) {
    console.warn('Unable to read signed-in user:', error)
    return READ_ONLY_USER
  }
}

export function isAdmin(user) { return user?.role === 'admin' }
export function canEdit(user) { return user?.role === 'admin' }
