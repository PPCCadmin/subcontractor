import React, { useEffect, useMemo, useRef, useState } from 'react'
import MapView from './components/Map.jsx'
import Sidebar from './components/Sidebar.jsx'
import SubDetail from './components/SubDetail.jsx'
import AddSubModal from './components/AddSubModal.jsx'
import CsvImportModal from './components/CsvImportModal.jsx'
import TopNav from './components/TopNav.jsx'
import Dashboard from './components/Dashboard.jsx'
import { loadSubs, migrate, loadProjects, saveProjects, STATUSES, visibleSubsForRole } from './data.js'
import * as turf from '@turf/turf'
import { fetchUser, canEdit } from './lib/auth.js'
import { saveSub, createSubs, rateSub, unrateSub } from './lib/api.js'

const SAVE_DELAY_MS = 800

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [subs, setSubs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingEnabled, setSavingEnabled] = useState(false)
  const [saveState, setSaveState] = useState({ status: 'idle' })
  const pendingSaves = useRef(new Map())
  const [tab, setTab] = useState('map')
  const [jobLocation, setJobLocation] = useState(null)
  const [radius, setRadius] = useState(50)
  const [selectedId, setSelectedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    jobQuery: '',
    services: new Set(),
    statuses: new Set(),
  })

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    loadSubs()
      .then(data => {
        setSubs(data.subs.map((sub, index) => ({ ...sub, _numericId: index + 1 })))
        setSavingEnabled(data.saving)
        setProjects(loadProjects())
      })
      .catch(error => console.error('Failed to load SubFinder data:', error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { saveProjects(projects) }, [projects])

  const role = user?.role || 'hps'
  const admin = canEdit(user)
  const visibleSubs = useMemo(() => visibleSubsForRole(subs, role), [subs, role])

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    const origin = jobLocation ? turf.point([jobLocation.lng, jobLocation.lat]) : null

    return visibleSubs.filter(sub => {
      if (query) {
        const searchable = `${sub.companyName || ''} ${sub.city || ''} ${sub.state || ''} ${sub.contactName || ''} ${sub.notes || ''}`.toLowerCase()
        if (!searchable.includes(query)) return false
      }

      if (filters.services.size > 0) {
        const services = sub.canonicalServices || []
        if (![...filters.services].some(service => services.includes(service))) return false
      }

      if (filters.statuses.size > 0 && !filters.statuses.has(sub.status)) return false

      if (origin) {
        if (sub.lat == null || sub.lng == null) return false
        const miles = turf.distance(origin, turf.point([sub.lng, sub.lat]), { units: 'miles' })
        if (miles > radius) return false
      }

      return true
    })
  }, [visibleSubs, filters, jobLocation, radius])

  const filteredIds = useMemo(() => filtered.map(sub => sub.id), [filtered])
  const mappedCount = useMemo(() => filtered.filter(sub => sub.lat != null && sub.lng != null).length, [filtered])
  const selectedSub = visibleSubs.find(sub => sub.id === selectedId) || null

  // Edits apply on screen immediately and are saved to the server once the
  // user pauses typing, so a burst of keystrokes becomes one save.
  const flushSave = (id, options) => {
    const pending = pendingSaves.current.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingSaves.current.delete(id)
    setSaveState({ status: 'saving' })
    saveSub(pending.sub, options)
      .then(() => { if (!pendingSaves.current.size) setSaveState({ status: 'saved' }) })
      .catch(error => setSaveState({ status: 'error', message: error.message }))
  }

  useEffect(() => {
    const flushAll = event => {
      if (!pendingSaves.current.size) return
      for (const id of [...pendingSaves.current.keys()]) flushSave(id, { keepalive: true })
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', flushAll)
    return () => window.removeEventListener('beforeunload', flushAll)
  }, [])

  const updateSub = updated => {
    if (!admin) return
    setSubs(previous => previous.map(sub => sub.id === updated.id ? updated : sub))
    if (!savingEnabled) return
    const existing = pendingSaves.current.get(updated.id)
    if (existing) clearTimeout(existing.timer)
    pendingSaves.current.set(updated.id, { sub: updated, timer: setTimeout(() => flushSave(updated.id), SAVE_DELAY_MS) })
    setSaveState({ status: 'pending' })
  }

  const addCreated = created => {
    const migrated = created.map(migrate)
    setSubs(previous => [
      ...previous,
      ...migrated.map((sub, index) => ({ ...sub, _numericId: previous.length + index + 1 })),
    ])
    return migrated
  }

  // Throws on failure so the Add / Import dialogs can stay open and show it.
  const createSub = async sub => {
    if (!admin) return
    const [created] = addCreated(await createSubs([sub]))
    setSelectedId(created.id)
  }
  const createManySubs = async newSubs => {
    if (!admin) return
    addCreated(await createSubs(newSubs))
  }

  // Ratings go straight to the server, which records who left each one.
  const applyRatings = saved => setSubs(previous => previous.map(sub => sub.id === saved.id ? { ...sub, ratings: saved.ratings || [] } : sub))
  const rate = (id, stars, comment) => rateSub(id, stars, comment).then(applyRatings)
  const unrate = id => unrateSub(id).then(applyRatings)
  const openSubFromDashboard = id => {
    setSelectedId(id)
    setTab('map')
  }

  if (authLoading || !user) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Signing in...</div>
  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading...</div>

  return (
    <div className="app-root">
      <TopNav active={tab} onChange={setTab} user={user} />

      {admin && !savingEnabled && (
        <div className="banner banner-warn app-banner">
          Saving isn't set up on the server yet, so changes you make won't be kept after you leave the page.
        </div>
      )}

      {tab === 'map' && (
        <div className="app">
          <Sidebar
            subs={visibleSubs}
            filteredSubs={filtered}
            filters={filters}
            setFilters={setFilters}
            jobLocation={jobLocation}
            setJobLocation={setJobLocation}
            radius={radius}
            setRadius={setRadius}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onAdd={admin ? () => setShowAdd(true) : null}
            onImport={admin ? () => setShowImport(true) : null}
          />

          <div className="map-wrap">
            <MapView
              subs={visibleSubs}
              filteredIds={filteredIds}
              jobLocation={jobLocation}
              radius={radius}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="map-overlay">
              <strong>{subs.length.toLocaleString()}</strong>&nbsp;total records
              <span style={{ color: 'var(--muted)' }}>
                · {filtered.length.toLocaleString()} matching
                · {mappedCount.toLocaleString()} mapped
                {jobLocation ? ` within ${radius} mi` : ''}
              </span>
            </div>

            <div className="legend">
              {STATUSES.map(status => (
                <div key={status.key} className="legend-item">
                  <span className="legend-swatch" style={{ background: status.color }} />
                  {status.label}
                </div>
              ))}
            </div>

            {selectedSub && (
              <SubDetail
                sub={selectedSub}
                jobLocation={jobLocation}
                projects={projects}
                canEdit={admin}
                user={user}
                saveState={saveState}
                onRate={rate}
                onUnrate={unrate}
                onClose={() => setSelectedId(null)}
                onChange={updateSub}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <Dashboard
          subs={visibleSubs}
          totalRecords={subs.length}
          projects={projects}
          onOpenSub={openSubFromDashboard}
        />
      )}

      {showAdd && admin && (
        <AddSubModal existingSubs={subs} onClose={() => setShowAdd(false)} onCreate={createSub} />
      )}

      {showImport && admin && (
        <CsvImportModal existingSubs={subs} onClose={() => setShowImport(false)} onImport={createManySubs} />
      )}
    </div>
  )
}
