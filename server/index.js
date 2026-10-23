// server/index.js
// -----------------------------------------------------------------------------
// SubFinder server: serves the built React app and a small JSON API that saves
// subcontractor edits and ratings. Users on the access list (Admin tab) can
// read the subcontractors near their business units; only admins can write.
// -----------------------------------------------------------------------------

import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createAuth, EMERGENCY_ADMINS } from './auth.js'
import { createAccess, AccessValidationError } from './access.js'
import { BUSINESS_UNITS, withinAreas } from './businessUnits.js'
import { openStore, ConflictError, describeStorageError } from './store.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const staticDir = process.env.STATIC_DIR || path.join(root, 'dist')
const seedFile = [path.join(staticDir, 'subcontractors.json'), path.join(root, 'public', 'subcontractors.json')].find(fs.existsSync)
const port = Number(process.env.PORT || 80)

const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
const seedById = new Map(seed.map(sub => [sub.id, sub]))
// Storage is checked once at startup; until then (or if it fails) the app is
// read-only and admins are told why.
let store = null
let storageProblem = 'the server is still starting up, try again in a moment.'
openStore().then(result => {
  store = result.store
  storageProblem = result.problem
  const configured = process.env.AZURE_STORAGE_CONNECTION_STRING ? 'AZURE_STORAGE_CONNECTION_STRING is set' : process.env.DATA_DIR ? 'DATA_DIR is set' : 'no AZURE_STORAGE_CONNECTION_STRING or DATA_DIR environment variable'
  console.log(`Storage: ${store ? store.kind : 'none, read-only'} (${configured})${storageProblem ? ` - problem: ${storageProblem}` : ''}`)
})

const access = createAccess(() => store)
const { getUser, requireAdmin } = createAuth(access)

const app = express()
app.disable('x-powered-by')
app.use('/api', express.json({ limit: '25mb' }))

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

function requireStore(req, res, next) {
  if (!store) return res.status(503).json({ error: storageProblem ? `Saving isn't working: ${storageProblem}` : 'Saving is not set up on this server yet, so changes cannot be saved.' })
  next()
}

// Remove client-only fields (e.g. _numericId, _dist) before storing.
function clean(sub) {
  return Object.fromEntries(Object.entries(sub || {}).filter(([key]) => !key.startsWith('_')))
}

// Read-modify-write one subcontractor, retrying if someone else saved it at
// the same moment so neither change is lost.
async function updateSub(id, change) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.get(id)
    const base = current?.sub ?? seedById.get(id)
    if (!base) return null
    const next = change(structuredClone(base))
    try {
      await store.put(id, next, current ? current.etag : null)
      return next
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error
    }
  }
  throw new ConflictError('Too many simultaneous changes, please try again.')
}

app.get('/health', (req, res) => res.type('text/plain').send('healthy\n'))

app.get('/api/me', asyncRoute(async (req, res) => res.set('Cache-Control', 'no-store').json(await getUser(req))))

app.get('/api/subs', asyncRoute(async (req, res) => {
  let saved = []
  let problem = store ? null : storageProblem
  if (store) {
    try {
      saved = await store.list()
    } catch (error) {
      console.error('Loading saved edits failed:', error?.code || error?.statusCode || error?.message)
      problem = describeStorageError(error)
    }
  }
  const savedById = new Map(saved.map(sub => [sub.id, sub]))
  const subs = seed.map(sub => savedById.get(sub.id) || sub)
  for (const sub of saved) if (!seedById.has(sub.id)) subs.push(sub)

  // Each user only receives the subcontractors they're allowed to see.
  const user = await getUser(req)
  let visible = subs
  if (user.role === 'none') visible = []
  else if (!user.allBusinessUnits) visible = subs.filter(sub => withinAreas(sub, user.areas))

  res.set('Cache-Control', 'no-store').json({
    saving: user.role === 'admin' && Boolean(store) && !problem,
    problem: user.role === 'admin' ? problem : null,
    subs: visible,
  })
}))

// Edit a subcontractor. Ratings are kept as stored; they change only through
// the rating endpoints so one admin can never overwrite another's rating.
app.put('/api/subs/:id', requireAdmin, requireStore, asyncRoute(async (req, res) => {
  const incoming = clean(req.body)
  const saved = await updateSub(req.params.id, current => ({
    ...incoming,
    id: req.params.id,
    ratings: current.ratings || [],
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.email,
  }))
  if (!saved) return res.status(404).json({ error: 'Subcontractor not found.' })
  res.json(saved)
}))

// Create one or more subcontractors (Add form and CSV import).
app.post('/api/subs', requireAdmin, requireStore, asyncRoute(async (req, res) => {
  const incoming = Array.isArray(req.body?.subs) ? req.body.subs : []
  if (!incoming.length) return res.status(400).json({ error: 'No subcontractors to add.' })
  const now = new Date().toISOString()
  const created = []
  for (const raw of incoming) {
    const sub = { ...clean(raw), ratings: [], createdAt: now, createdBy: req.user.email }
    if (!sub.id || seedById.has(sub.id)) sub.id = crypto.randomUUID()
    try {
      await store.put(sub.id, sub, null)
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error
      sub.id = crypto.randomUUID()
      await store.put(sub.id, sub, null)
    }
    created.push(sub)
  }
  res.status(201).json({ subs: created })
}))

// Add or replace the signed-in admin's own rating.
app.put('/api/subs/:id/rating', requireAdmin, requireStore, asyncRoute(async (req, res) => {
  const stars = Number(req.body?.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'Rating must be 1 to 5 stars.' })
  const comment = String(req.body?.comment || '').trim().slice(0, 2000)
  const { email, name } = req.user

  const saved = await updateSub(req.params.id, sub => {
    const ratings = sub.ratings || []
    const mine = ratings.find(item => item.byEmail === email)
    const entry = { id: mine?.id || crypto.randomUUID(), stars, comment, byEmail: email, byName: name, date: new Date().toISOString().slice(0, 10) }
    return { ...sub, ratings: mine ? ratings.map(item => item.id === mine.id ? entry : item) : [...ratings, entry] }
  })
  if (!saved) return res.status(404).json({ error: 'Subcontractor not found.' })
  res.json(saved)
}))

// Remove the signed-in admin's own rating.
app.delete('/api/subs/:id/rating', requireAdmin, requireStore, asyncRoute(async (req, res) => {
  const saved = await updateSub(req.params.id, sub => ({
    ...sub,
    ratings: (sub.ratings || []).filter(item => item.byEmail !== req.user.email),
  }))
  if (!saved) return res.status(404).json({ error: 'Subcontractor not found.' })
  res.json(saved)
}))

// ---- Admin tab: who can use SubFinder and which business units they see ----

app.get('/api/admin/access', requireAdmin, asyncRoute(async (req, res) => {
  const doc = await access.load({ fresh: true })
  res.set('Cache-Control', 'no-store').json({
    ...doc.value,
    version: doc.etag,
    canSave: Boolean(store) && !doc.unavailable,
    emergencyAdmins: EMERGENCY_ADMINS,
    businessUnits: BUSINESS_UNITS.map(({ key, name, address }) => ({ key, name, address })),
  })
}))

app.put('/api/admin/access', requireAdmin, requireStore, asyncRoute(async (req, res) => {
  const doc = await access.save(req.body || {}, req.body?.version, { email: req.user.email, emergency: req.user.builtInAdmin })
  res.json({ ...doc.value, version: doc.etag })
}))

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

// The full seed list must only come through /api/subs, which filters by user.
app.get('/subcontractors.json', (req, res) => res.status(404).end())

// Built front end. Hashed assets cache forever; index.html never does.
app.use('/assets', express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y' }))
app.use(express.static(staticDir, { index: false, maxAge: 0 }))
app.get('*', (req, res, next) => {
  const index = path.join(staticDir, 'index.html')
  if (!fs.existsSync(index)) return next()
  res.set('Cache-Control', 'no-cache').sendFile(index)
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error instanceof ConflictError) return res.status(409).json({ error: error.message })
  if (error instanceof AccessValidationError) return res.status(400).json({ error: error.message })
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'That change is too large to save (attachments over 25 MB).' })
  console.error(error)
  res.status(500).json({ error: 'Something went wrong saving your change.' })
})

app.listen(port, () => {
  console.log(`SubFinder listening on :${port}`)
})
