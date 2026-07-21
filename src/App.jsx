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
import ProjectsView from './components/ProjectsView.jsx'
import PricingView from './components/PricingView.jsx'
import {
  loadSubs, saveSubs, loadRfqs, saveRfqs,
  loadProjects, saveProjects, loadPricing, savePricing, STATUSES
} from './data.js'
import { daysUntil } from './lib/metrics.js'
import * as turf from '@turf/turf'

export default function App() {
  const [subs, setSubs] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [projects, setProjects] = useState([])
  const [pricing, setPricing] = useState([])
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
  })

  useEffect(() => {
    loadSubs().then(d => {
      const withNum = d.map((s, i) => ({ ...s, _numericId: i + 1 }))
      setSubs(withNum)
      setRfqs(loadRfqs())
      setProjects(loadProjects())
      setPricing(loadPricing())
      setLoading(false)
    })
  }, [])

  useEffect(() => { if (subs.length) saveSubs(subs) }, [subs])
  useEffect(() => { saveRfqs(rfqs) }, [rfqs])
  useEffect(() => { saveProjects(projects) }, [projects])
  useEffect(() => { savePricing(pricing) }, [pricing])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const svc = filters.services
    const st = filters.statuses
    const from = jobLocation ? turf.point([jobLocation.lng, jobLocation.lat]) : null
    return subs.filter(s => {
      if (q) {
        const hay = `${s.companyName} ${s.city || ''} ${s.state || ''} ${s.contactName || ''} ${s.notes || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (svc.size > 0) {
        const scs = new Set(s.canonicalServices || [])
        for (const need of svc) if (!scs.has(need)) return false
      }
      if (st.size > 0 && !st.has(s.status)) return false
      if (from && s.lat != null && s.lng != null) {
        const d = turf.distance(from, turf.point([s.lng, s.lat]), { units: 'miles' })
        if (d > radius) return false
      } else if (from) { return false }
      return true
    })
  }, [subs, filters, jobLocation, radius])

  const filteredIds = useMemo(() => filtered.map(s => s.id), [filtered])
  const selectedSub = subs.find(s => s.id === selectedId) || null

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
    subs.filter(s => [s.coiGL, s.coiAuto, s.coiWC].some(d => {
      const days = daysUntil(d)
      return days !== null && days >= 0 && days <= 30
    })).length
  , [subs])

  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading...</div>

  const openSubFromDashboard = (id) => { setSelectedId(id); setTab('map') }

  return (
    <div className="app-root">
      <TopNav active={tab} onChange={setTab} alertCount={alertCount} />
      {tab !== 'dashboard' && <ExpirationBanner subs={subs} onView={() => setTab('dashboard')} />}

      {tab === 'map' && (
        <div className="app">
          <Sidebar
            subs={subs} filteredSubs={filtered}
            filters={filters} setFilters={setFilters}
            jobLocation={jobLocation} setJobLocation={setJobLocation}
            radius={radius} setRadius={setRadius}
            selectedId={selectedId} setSelectedId={setSelectedId}
            onAdd={() => setShowAdd(true)}
            onImport={() => setShowImport(true)}
          />
          <div className="map-wrap">
            <MapView
              subs={subs} filteredIds={filteredIds}
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
                onClose={() => setSelectedId(null)}
                onChange={updateSub}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'dashboard' && <Dashboard subs={subs} projects={projects} onOpenSub={openSubFromDashboard} />}
      {tab === 'rfqs'      && <RfqView rfqs={rfqs} setRfqs={setRfqs} subs={subs} />}
      {tab === 'projects'  && <ProjectsView projects={projects} setProjects={setProjects} subs={subs} />}
      {tab === 'pricing'   && <PricingView pricing={pricing} setPricing={setPricing} subs={subs} projects={projects} />}

      {showAdd && (
        <AddSubModal existingSubs={subs} onClose={() => setShowAdd(false)} onCreate={createSub} />
      )}
      {showImport && (
        <CsvImportModal existingSubs={subs} onClose={() => setShowImport(false)} onImport={createManySubs} />
      )}
    </div>
  )
}