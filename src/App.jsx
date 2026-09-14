import React, { useEffect, useMemo, useState } from 'react'
import MapView from './components/Map.jsx'
import Sidebar from './components/Sidebar.jsx'
import SubDetail from './components/SubDetail.jsx'
import AddSubModal from './components/AddSubModal.jsx'
import CsvImportModal from './components/CsvImportModal.jsx'
import TopNav from './components/TopNav.jsx'
import Dashboard from './components/Dashboard.jsx'
import RfqView from './components/RfqView.jsx'
import { loadSubs, saveSubs, loadRfqs, saveRfqs, loadProjects, saveProjects, STATUSES, visibleSubsForRole } from './data.js'
import * as turf from '@turf/turf'

const ADMIN_EMAILS = new Set([
  'luke.norvid@heartlandpavingpartners.com',
  'todd.koehler@heartlandpavingpartners.com',
  'lisa.callahan@heartlandpavingsolutions.com',
])

const FALLBACK_USER = {
  authenticated: true,
  name: 'HPP User',
  email: '',
  role: 'hps',
  bu: null,
  roles: [],
}

function claimValue(claims, type) {
  return claims?.find(claim => claim.typ === type)?.val || ''
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [subs, setSubs] = useState([])
  const [rfqs, setRfqs] = useState([])
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
    fetch('/.auth/me', { credentials: 'include', cache: 'no-store', redirect: 'manual' })
      .then(async response => {
        if (!response.ok) throw new Error(`Authentication check failed: ${response.status}`)
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) throw new Error('Easy Auth identity endpoint did not return JSON')
        return response.json()
      })
      .then(data => {
        const containerPrincipal = Array.isArray(data) ? data[0] : null
        const staticPrincipal = data?.clientPrincipal || null
        if (!containerPrincipal && !staticPrincipal) {
          setUser(FALLBACK_USER)
          return
        }
        const containerClaims = containerPrincipal?.user_claims || []
        const staticClaims = staticPrincipal?.claims || []
        const claims = containerClaims.length ? containerClaims : staticClaims
        const email = String(
          containerPrincipal?.user_name ||
          staticPrincipal?.userDetails ||
          claimValue(claims, 'preferred_username') ||
          claimValue(claims, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ||
          claimValue(claims, 'emails') ||
          ''
        ).trim().toLowerCase()
        const name = claimValue(claims, 'name') || claimValue(claims, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name') || email || 'HPP User'
        setUser({
          authenticated: true,
          name,
          email,
          role: ADMIN_EMAILS.has(email) ? 'admin' : 'hps',
          bu: null,
          roles: staticPrincipal?.userRoles || containerPrincipal?.user_roles || [],
        })
      })
      .catch(error => {
        console.warn('Unable to read Easy Auth identity:', error)
        setUser(FALLBACK_USER)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    loadSubs()
      .then(data => {
        setSubs(data.map((sub, index) => ({ ...sub, _numericId: index + 1 })))
        setRfqs(loadRfqs())
        setProjects(loadProjects())
      })
      .catch(error => console.error('Failed to load SubFinder data:', error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (subs.length) saveSubs(subs) }, [subs])
  useEffect(() => { saveRfqs(rfqs) }, [rfqs])
  useEffect(() => { saveProjects(projects) }, [projects])

  const role = user?.role || 'hps'
  const admin = role === 'admin'
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

  const updateSub = updated => setSubs(previous => previous.map(sub => sub.id === updated.id ? updated : sub))
  const createSub = sub => {
    setSubs(previous => [...previous, { ...sub, _numericId: previous.length + 1 }])
    setSelectedId(sub.id)
  }
  const createManySubs = newSubs => setSubs(previous => [
    ...previous,
    ...newSubs.map((sub, index) => ({ ...sub, _numericId: previous.length + index + 1 })),
  ])
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
                rfqs={rfqs}
                projects={projects}
                canEdit={admin}
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

      {tab === 'rfqs' && <RfqView rfqs={rfqs} setRfqs={setRfqs} subs={visibleSubs} />}

      {showAdd && admin && (
        <AddSubModal existingSubs={subs} onClose={() => setShowAdd(false)} onCreate={createSub} />
      )}

      {showImport && admin && (
        <CsvImportModal existingSubs={subs} onClose={() => setShowImport(false)} onImport={createManySubs} />
      )}
    </div>
  )
}
