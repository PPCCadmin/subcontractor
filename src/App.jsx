import React, { useEffect, useMemo, useState } from 'react'
import MapView from './components/Map.jsx'
import Sidebar from './components/Sidebar.jsx'
import SubDetail from './components/SubDetail.jsx'
import AddSubModal from './components/AddSubModal.jsx'
import CsvImportModal from './components/CsvImportModal.jsx'
import TopNav from './components/TopNav.jsx'
import Dashboard from './components/Dashboard.jsx'
import { loadSubs, saveSubs, loadProjects, saveProjects, STATUSES, visibleSubsForRole } from './data.js'
import * as turf from '@turf/turf'
import { fetchUser, canEdit } from './lib/auth.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [subs, setSubs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
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
        setSubs(data.map((sub, index) => ({ ...sub, _numericId: index + 1 })))
        setProjects(loadProjects())
      })
      .catch(error => console.error('Failed to load SubFinder data:', error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (subs.length) saveSubs(subs) }, [subs])
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

  const updateSub = updated => {
    if (!admin) return
    setSubs(previous => previous.map(sub => sub.id === updated.id ? updated : sub))
  }
  const createSub = sub => {
    if (!admin) return
    setSubs(previous => [...previous, { ...sub, _numericId: previous.length + 1 }])
    setSelectedId(sub.id)
  }
  const createManySubs = newSubs => {
    if (!admin) return
    setSubs(previous => [
      ...previous,
      ...newSubs.map((sub, index) => ({ ...sub, _numericId: previous.length + index + 1 })),
    ])
  }
  const openSubFromDashboard = id => {
    setSelectedId(id)
    setTab('map')
  }

  if (authLoading || !user) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Signing in...</div>
  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading...</div>

  return (
    <div className="app-root">
      <TopNav active={tab} onChange={setTab} user={user} />

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
