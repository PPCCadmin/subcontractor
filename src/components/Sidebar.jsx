import React from 'react'
import { SERVICE_TAXONOMY, STATUSES } from '../data.js'
import { SearchIcon, MapPinIcon, PlusIcon, UploadIcon } from './icons.jsx'
import * as turf from '@turf/turf'

function StatusPill({ status }) {
  if (!status) return null
  const cls = 'pill pill-' + String(status).replace(/\s+/g, '')
  return <span className={cls}>{status}</span>
}

export default function Sidebar({
  subs, filteredSubs, filters, setFilters, jobLocation, setJobLocation,
  radius, setRadius, selectedId, setSelectedId, onAdd, onImport
}) {
  const toggleService = (s) => {
    const next = new Set(filters.services)
    next.has(s) ? next.delete(s) : next.add(s)
    setFilters({ ...filters, services: next })
  }
  const toggleStatus = (s) => {
    const next = new Set(filters.statuses)
    next.has(s) ? next.delete(s) : next.add(s)
    setFilters({ ...filters, statuses: next })
  }

  const geocode = async () => {
    const q = filters.jobQuery && filters.jobQuery.trim()
    if (!q) return
    try {
      const usViewbox = '-124.733253,49.384358,-66.949778,24.544091'
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${usViewbox}&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      const data = await res.json()
      if (data && data[0] && data[0].lat && data[0].lon) {
        setJobLocation({ lat: +data[0].lat, lng: +data[0].lon, label: data[0].display_name })
      } else {
        alert('No US results found. Try a full address, city + state, or ZIP code within the United States.')
      }
    } catch (e) {
      alert('Geocoding failed. Please try again.')
    }
  }

  const sorted = React.useMemo(() => {
    if (!jobLocation) return filteredSubs
    const from = turf.point([jobLocation.lng, jobLocation.lat])
    return [...filteredSubs].map(s => {
      if (s.lat == null || s.lng == null) return { ...s, _dist: Infinity }
      const d = turf.distance(from, turf.point([s.lng, s.lat]), { units: 'miles' })
      return { ...s, _dist: d }
    }).sort((a, b) => a._dist - b._dist)
  }, [filteredSubs, jobLocation])

  return (
    <aside className="sidebar">
      <div className="sidebar-header sidebar-header-slim">
        <div className="sidebar-title">
          <div>
            <div className="sidebar-title-main">Subcontractors</div>
            <div className="sidebar-title-sub">{subs.length.toLocaleString()} on record</div>
          </div>
          <div className="header-actions">
            {onAdd && (
              <button className="icon-btn light" onClick={onAdd} title="Add new subcontractor">
                <PlusIcon />
              </button>
            )}
            {onImport && (
              <button className="icon-btn light" onClick={onImport} title="Import from CSV">
                <UploadIcon />
              </button>
            )}
          </div>
        </div>
        <div className="search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search company, city, contact..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-label">Job Location</div>
        <div className="job-input">
          <input
            type="text"
            placeholder="Address or city, state"
            value={filters.jobQuery || ''}
            onChange={e => setFilters({ ...filters, jobQuery: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') geocode() }}
          />
          <button className="btn" onClick={geocode}>Find</button>
        </div>
        {jobLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            <MapPinIcon />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {jobLocation.label || `${jobLocation.lat.toFixed(3)}, ${jobLocation.lng.toFixed(3)}`}
            </span>
            <button
              className="btn secondary"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => setJobLocation(null)}
            >
              Clear
            </button>
          </div>
        )}
        <div className="filter-label" style={{ marginTop: 14 }}>Radius</div>
        <div className="slider-row">
          <input
            type="range" min="5" max="500" step="5"
            value={radius}
            onChange={e => setRadius(+e.target.value)}
          />
          <span className="value">{radius} mi</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-label">Services</div>
        <div className="chips">
          {SERVICE_TAXONOMY.map(s => (
            <div
              key={s}
              className={'chip' + (filters.services.has(s) ? ' active' : '')}
              onClick={() => toggleService(s)}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="filter-label" style={{ marginTop: 12 }}>Status</div>
        <div className="chips">
          {STATUSES.map(st => (
            <div
              key={st.key}
              className={'chip status-' + st.key.replace(/\s+/g, '') + (filters.statuses.has(st.key) ? ' active' : '')}
              onClick={() => toggleStatus(st.key)}
            >
              {st.label}
            </div>
          ))}
        </div>
      </div>

      <div className="list-count">
        {sorted.length.toLocaleString()} match{sorted.length === 1 ? '' : 'es'}
        {jobLocation && ' · sorted by distance'}
      </div>
      <div className="list">
        {sorted.slice(0, 300).map(s => (
          <div
            key={s.id}
            className={'sub-card' + (s.id === selectedId ? ' selected' : '')}
            onClick={() => setSelectedId(s.id)}
          >
            <div className="sub-name-row">
              <div className="sub-name">{s.companyName}</div>
              {s._dist != null && s._dist !== Infinity && (
                <span className="sub-dist">{s._dist.toFixed(0)} mi</span>
              )}
            </div>
            <div className="sub-meta">
              <StatusPill status={s.status} />
              {s.city && <span className="sub-city">{s.city}, {s.state}</span>}
            </div>
            {s.canonicalServices && s.canonicalServices.length > 0 && (
              <div className="sub-services">
                {s.canonicalServices.slice(0, 4).map(cs => (
                  <span key={cs} className="mini-chip">{cs}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {sorted.length > 300 && (
          <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            Showing first 300 · refine filters to see more
          </div>
        )}
      </div>
    </aside>
  )
}