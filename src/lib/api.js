// src/lib/api.js
// Calls to the SubFinder server (server/index.js). The server decides who may
// make changes; errors come back as { error: 'message' }.

function devHeaders() {
  // Local dev only (stripped from production builds): preview as another user.
  if (!import.meta.env.DEV) return {}
  const email = localStorage.getItem('dev-user-email')
  return email ? { 'X-Dev-User': email } : {}
}

export async function api(path, { method = 'GET', body, keepalive } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    keepalive,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...devHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

export const getMe = () => api('/me')
export const getSubs = () => api('/subs')
export const saveSub = (sub, options) => api(`/subs/${encodeURIComponent(sub.id)}`, { method: 'PUT', body: sub, ...options })
export const createSubs = subs => api('/subs', { method: 'POST', body: { subs } }).then(data => data.subs)
export const rateSub = (id, stars, comment) => api(`/subs/${encodeURIComponent(id)}/rating`, { method: 'PUT', body: { stars, comment } })
export const unrateSub = id => api(`/subs/${encodeURIComponent(id)}/rating`, { method: 'DELETE' })
