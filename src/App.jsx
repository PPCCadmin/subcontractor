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
  loadSubs,
  saveSubs,
  loadRfqs,
  saveRfqs,
  loadProjects,
  saveProjects,
  STATUSES,
  visibleSubsForRole,
} from './data.js'
import { daysUntil } from './lib/metrics.js'
import * as turf from '@turf/turf'

function hasCoiExpiringSoon(sub, warnDays = 30) {
  return [sub.coiGL, sub.coiAuto, sub.coiWC].some(date => {
    const days = daysUntil(date)
    return days !== null && days <= warnDays
  })
}

export default function App() {
  // Azure Container Apps Easy Auth already protects the site and handles sign-in.
  // Do not add a second client-side /.auth/me login gate here.
  const user = {
    authenticated: true,
    name: 'HPP User',
    email: '',
    role: 'admin',
    bu: null,
  }

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
    coiExpiringOnly: false,
  })

  useEffect(() => {
    loadSubs()
      .then(data => {
        const withNumericIds = data.map((sub, index) => ({
          ...sub,
          _numericId: index + 1,
        }))

        setSubs(withNumericIds)
        setRfqs(loadRfqs())
        setProjects(loadProjects())
        setLoading(false)
      })
      .catch(error => {
        console.error('Failed to load SubFinder data:', error)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (subs.length) saveSubs(subs)
  }, [subs])

  useEffect(() => {
    saveRfqs(rfqs)
  }, [rfqs])

  useEffect(() => {
    saveProjects(projects)
  }, [projects])

  const role = user.role
  const admin = true

  const visibleSubs = useMemo(
    () => visibleSubsForRole(subs, role),
    [subs, role]
  )

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    const selectedServices = filters.services
    const selectedStatuses = filters.statuses
    const origin = jobLocation
      ? turf.point([jobLocation.lng, jobLocation.lat])
      : null

    return visibleSubs.filter(sub => {
      if (query) {
        const searchableText = `${sub.companyName || ''} ${sub.city || ''} ${sub.state || ''} ${sub.contactName || ''} ${sub.notes || ''}`.toLowerCase()
        if (!searchableText.includes(query)) return false
      }

      if (selectedServices.size > 0) {
        const subServices = new Set(sub.canonicalServices || [])
        for (const service of selectedServices) {
          if (!subServices.has(service)) return false
        }
      }

      if (selectedStatuses.size > 0 && !selectedStatuses.has(sub.status)) {
        return false
      }

      if (
        filters.coiExpiringOnly &&
        !hasCoiExpiringSoon(sub, 30)
      ) {
        return false
      }

      if (origin) {
        if (sub.lat == null || sub.lng == null) return false

        const distance = turf.distance(
          origin,
          turf.point([sub.lng, sub.lat]),
          { units: 'miles' }
        )

        if (distance > radius) return false
      }

      return true
    })
  }, [visibleSubs, filters, jobLocation, radius])

  const filteredIds = useMemo(
    () => filtered.map(sub => sub.id),
    [filtered]
  )

  const selectedSub =
    visibleSubs.find(sub => sub.id === selectedId) || null

  const updateSub = updatedSub => {
    setSubs(previous =>
      previous.map(sub =>
        sub.id === updatedSub.id ? updatedSub : sub
      )
    )
  }

  const createSub = newSub => {
    setSubs(previous => [
      ...previous,
      {
        ...newSub,
        _numericId: previous.length + 1,
      },
    ])
    setSelectedId(newSub.id)
  }

  const createManySubs = newSubs => {
    setSubs(previous => {
      const firstNumericId = previous.length + 1
      const withNumericIds = newSubs.map((sub, index) => ({
        ...sub,
        _numericId: firstNumericId + index,
      }))

      return [...previous, ...withNumericIds]
    })
  }

  const alertCount = useMemo(
    () => visibleSubs.filter(sub => hasCoiExpiringSoon(sub, 30)).length,
    [visibleSubs]
  )

  const openSubFromDashboard = id => {
    setSelectedId(id)
    setTab('map')
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="app-root">
      <TopNav
        active={tab}
        onChange={setTab}
        alertCount={alertCount}
        user={user}
      />

      {tab !== 'dashboard' && (
        <ExpirationBanner
          subs={visibleSubs}
          onView={() => setTab('dashboard')}
        />
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
              <strong>{filtered.length.toLocaleString()}</strong>
              &nbsp;subs shown
              {jobLocation && (
                <span style={{ color: 'var(--muted)' }}>
                  &nbsp;within {radius} mi
                </span>
              )}
            </div>

            <div className="legend">
              {STATUSES.map(status => (
                <div key={status.key} className="legend-item">
                  <span
                    className="legend-swatch"
                    style={{ background: status.color }}
                  />
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
          projects={projects}
          onOpenSub={openSubFromDashboard}
        />
      )}

      {tab === 'rfqs' && (
        <RfqView
          rfqs={rfqs}
          setRfqs={setRfqs}
          subs={visibleSubs}
        />
      )}

      {showAdd && admin && (
        <AddSubModal
          existingSubs={subs}
          onClose={() => setShowAdd(false)}
          onCreate={createSub}
        />
      )}

      {showImport && admin && (
        <CsvImportModal
          existingSubs={subs}
          onClose={() => setShowImport(false)}
          onImport={createManySubs}
        />
      )}
    </div>
  )
}
