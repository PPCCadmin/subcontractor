import React, { useEffect, useMemo, useState } from 'react'
import MapView from './components/Map.jsx'
import Sidebar from './components/Sidebar.jsx'
import SubDetail from './components/SubDetail.jsx'
import AddSubModal from './components/AddSubModal.jsx'
import CsvImportModal from './components/CsvImportModal.jsx'
import TopNav from './components/TopNav.jsx'
import ExpirationBanner from './components/ExpirationBanner.jsx'
import Dashboard from './components/Dashboard.jsx'
import RfqView from './components/RfqView.jsx'
import {
  loadSubs, saveSubs, loadRfqs, saveRfqs,
  loadProjects, saveProjects, STATUSES, visibleSubsForRole
} from './data.js'
import { fetchUser, isAdmin, LOGIN_URL } from './lib/auth.js'
import { daysUntil } from './lib/metrics.js'
import * as turf from '@turf/turf'

// True if the sub has any COI (GL/Auto/WC) that is already expired
// or will expire within `warnDays` (default 30).
function hasCoiExpiringSoon(sub, warnDays = 30) {
  return [sub.coiGL, sub.coiAuto, sub.coiWC].some(d => {
    const days = daysUntil(d)
    return days !== null && days <= warnDays
  })
}

function LoginScreen() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">HPP</div>
          <div>
            <div className="login-brand-name">SubFinder</div>
            <div className="login-brand-sub">Heartland Paving Partners</div>
          </div>
        </div>
        <div className="login-title">Sign in required</div>
        <p className="login-text">
          This tool contains proprietary HPS subcontractor data. Sign in with your
          Heartland Paving Partners account to continue.
        </p>
        <a className="btn login-btn" href={LOGIN_URL}>Sign in with Microsoft</a>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null) // null = auth loading
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
    search: '', jobQuery: '',
    services: new Set(), statuses: new Set(),
    coiExpiringOnly: false,
  })

  // Resolve the signed-in user (SSO). In local dev there is no /.auth endpoint,
  // so fall back to an admin identity so you can still work locally.
  useEffect(() => {
    if (import.meta?.env?.DEV) {
      setUser({ authenticated: true, name: 'Local Dev', email: 'dev@local', role: 'admin', bu: null })
      return
    }
    fetchUser().then(setUser)
  }, [])

  useEffect(() => {
    if (!user?.authenticated) return
    loadSubs().then(d => {
      const withNum = d.map((s, i) => ({ ...s, _numericId: i + 1 }))
      setSubs(withNum)
      setRfqs(loadRfqs())
      setProjects(loadProjects())
      setLoading(false)
    })
  }, [user])

  useEffect(() => { if (subs.length) saveSubs(subs) }, [subs])
  useEffect(() => { saveRfqs(rfqs) }, [rfqs])
  useEffect(() => { saveProjects(projects) }, [projects])

  const role = user?.role || 'hps'
  const admin = isAdmin(user)

  // Everything downstream works off the role-scoped set so BU users can never
  // see (on the map, in the list, in the dashboard) vendors they aren't allowed to.
  const visibleSubs = useMemo(
    () => visibleSubsForRole(subs, role),
    [subs, role]
  )

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const svc = filters.services
    const st = filters.statuses
    const from = jobLocation ? turf.point([jobLocation.lng, jobLocation.lat]) : null
    return visibleSubs.filter(s => {
      if (q) {
        const hay = `${s.companyName} ${s.city || ''} ${s.state || ''} ${s.contactName || ''} ${s.notes || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (svc.size > 0) {
        const scs = new Set(s.canonicalServices || [])
        for (const need of svc) if (!scs.has(need)) return false
      }
      if (st.size > 0 && !st.has(s.status)) return false
      if (filters.coiExpiringOnly && !hasCoiExpiringSoon(s, 30)) return false
      if (from && s.lat != null && s.lng != null) {
        const d = turf.distance(from, turf.point([s.lng, s.lat]), { units: 'miles' })
        if (d > radius) return false
      } else if (from) { return false }
      return true
    })
  }, [visibleSubs, filters, jobLocation, radius])

  const filteredIds = useMemo(() => filtered.map(s => s.id), [filtered])
  const selectedSub = visibleSubs.find(s => s.id === selectedId) || null

  const updateSub = (updated) => {
    setSubs(prev => prev.map(s => s.id === updated.id ? updated : s))
  }
  const createSub = (newSub) => {
    setSubs(prev => [...prev, { ...newSub, _numericId: prev.length + 1 }])
    setSelectedId(newSub.id)
  }
  const createManySubs = (newSubs) => {
    setSubs(prev => {
      const start = prev.length + 1
      const withNum = newSubs.map((s, i) => ({ ...s, _numericId: start + i }))
      return [...prev, ...withNum]
    })
  }

  const alertCount = useMemo(() =>
    visibleSubs.filter(s => hasCoiExpiringSoon(s, 30)).length
  , [visibleSubs])

  // ---- Auth gates ----------------------------------------------------------
  if (user === null) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Signing in…</div>
  if (!user.authenticated) return <LoginScreen />
  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading…</div>

  const openSubFromDashboard = (id) => { setSelectedId(id); setTab('map') }

  return (
    <div className="app-root">
      <TopNav active={tab} onChange={setTab} alertCount={alertCount} user={user} />
      {tab !== 'dashboard' && <ExpirationBanner subs={visibleSubs} onView={() => setTab('dashboard')} />}
      {tab === 'map' && (
        <div className="app">
          <Sidebar
            subs={visibleSubs} filteredSubs={filtered}
            filters={filters} setFilters={setFilters}
            jobLocation={jobLocation} setJobLocation={setJobLocation}
            radius={radius} setRadius={setRadius}
            selectedId={selectedId} setSelectedId={setSelectedId}
            onAdd={admin ? () => setShowAdd(true) : null}
            onImport={admin ? () => setShowImport(true) : null}
          />
          <div className="map-wrap">
            <MapView
              subs={visibleSubs} filteredIds={filteredIds}
              jobLocation={jobLocation} radius={radius}
              selectedId={selectedId} onSelect={setSelectedId}
            />
            <div className="map-overlay">
              <strong>{filtered.length.toLocaleString()}</strong>&nbsp;subs shown
              {jobLocation && <span style={{ color: 'var(--muted)' }}>&nbsp;within {radius} mi</span>}
            </div>
            <div className="legend">
              {STATUSES.map(s => (
                <div key={s.key} className="legend-item">
                  <span className="legend-swatch" style={{ background: s.color }}></span>{s.label}
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
      {tab === 'dashboard' && <Dashboard subs={visibleSubs} projects={projects} onOpenSub={openSubFromDashboard} />}
      {tab === 'rfqs' && (admin || role === 'hps') && <RfqView rfqs={rfqs} setRfqs={setRfqs} subs={visibleSubs} />}
      {showAdd && admin && (
        <AddSubModal existingSubs={subs} onClose={() => setShowAdd(false)} onCreate={createSub} />
      )}
      {showImport && admin && (
        <CsvImportModal existingSubs={subs} onClose={() => setShowImport(false)} onImport={createManySubs} />
      )}
    </div>
  )
}
