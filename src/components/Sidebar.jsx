import React from 'react'
import { SERVICE_TAXONOMY, STATUSES } from '../data.js'
import { SearchIcon, MapPinIcon, PlusIcon, UploadIcon } from './icons.jsx'
import * as turf from '@turf/turf'

function StatusPill({ status }) {
  if (!status) return null
  return <span className={'pill pill-' + String(status).replace(/\s+/g, '')}>{status}</span>
}

function ApproxChip({ sub }) {
  if (sub.locationAccuracy !== 'approximate') return null
  return <span className="mini-chip approx-chip" title="Approximate city-level location">Approx</span>
}

export default function Sidebar({
  subs,
  filteredSubs,
  filters,
  setFilters,
  jobLocation,
  setJobLocation,
  radius,
  setRadius,
  selectedId,
  setSelectedId,
  onAdd,
  onImport,
}) {
  const toggleService = service => {
    const next = new Set(filters.services)
    next.has(service) ? next.delete(service) : next.add(service)
    setFilters({ ...filters, services: next })
  }

  const toggleStatus = status => {
    const next = new Set(filters.statuses)
    next.has(status) ? next.delete(status) : next.add(status)
    setFilters({ ...filters, statuses: next })
  }

  const clearFilters = () => {
    setFilters({
      ...filters,
      search: '',
      services: new Set(),
      statuses: new Set(),
    })
  }

  const geocode = async () => {
    const query = filters.jobQuery?.trim()
    if (!query) return

    try {
      const viewbox = '-124.733253,49.384358,-66.949778,24.544091'
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(query)}`
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = await response.json()

      if (data?.[0]?.lat && data?.[0]?.lon) {
        setJobLocation({
          lat: +data[0].lat,
          lng: +data[0].lon,
          label: data[0].display_name,
        })
      } else {
        alert('No US results found. Try a full address, city and state, or ZIP code.')
      }
    } catch {
      alert('Geocoding failed. Please try again.')
    }
  }

  const sorted = React.useMemo(() => {
    if (!jobLocation) return filteredSubs

    const origin = turf.point([jobLocation.lng, jobLocation.lat])

    return [...filteredSubs]
      .map(sub => {
        if (sub.lat == null || sub.lng == null) return { ...sub, _dist: Infinity }
        return {
          ...sub,
          _dist: turf.distance(origin, turf.point([sub.lng, sub.lat]), { units: 'miles' }),
        }
      })
      .sort((a, b) => a._dist - b._dist)
  }, [filteredSubs, jobLocation])

  const hasFilters = Boolean(filters.search || filters.services.size || filters.statuses.size)

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
              <button className="icon-btn light" onClick={onAdd} title="Add subcontractor">
                <PlusIcon />
              </button>
            )}
            {onImport && (
              <button className="icon-btn light" onClick={onImport} title="Import CSV">
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
            onChange={event => setFilters({ ...filters, search: event.target.value })}
          />
        </div>
      </div>

      <div className="sidebar-filter-area">
        <div className="filter-section compact-location-filter">
          <div className="filter-label">Job Location</div>
          <div className="job-input">
            <input
              type="text"
              placeholder="Address or city, state"
              value={filters.jobQuery || ''}
              onChange={event => setFilters({ ...filters, jobQuery: event.target.value })}
              onKeyDown={event => { if (event.key === 'Enter') geocode() }}
            />
            <button className="btn" onClick={geocode}>Find</button>
          </div>

          {jobLocation && (
            <div className="job-location-summary">
              <MapPinIcon />
              <span>{jobLocation.label || `${jobLocation.lat.toFixed(3)}, ${jobLocation.lng.toFixed(3)}`}</span>
              <button className="btn secondary btn-sm" onClick={() => setJobLocation(null)}>Clear</button>
            </div>
          )}

          <div className="slider-row compact-radius">
            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={radius}
              onChange={event => setRadius(+event.target.value)}
            />
            <span className="value">{radius} mi</span>
          </div>
        </div>

        <div className="filter-section service-filter-section">
          <div className="filter-label">Services</div>
          <div className="chips service-filter-chips">
            {SERVICE_TAXONOMY.map(service => (
              <button
                type="button"
                key={service}
                className={'chip' + (filters.services.has(service) ? ' active' : '')}
                onClick={() => toggleService(service)}
              >
                {service}
              </button>
            ))}
          </div>

          <div className="filter-label status-filter-label">Status</div>
          <div className="chips">
            {STATUSES.map(status => (
              <button
                type="button"
                key={status.key}
                className={'chip status-' + status.key.replace(/\s+/g, '') + (filters.statuses.has(status.key) ? ' active' : '')}
                onClick={() => toggleStatus(status.key)}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="results-header">
        <div>
          <strong>{sorted.length.toLocaleString()}</strong> match{sorted.length === 1 ? '' : 'es'}
          {jobLocation && ' · sorted by distance'}
        </div>
        {hasFilters && (
          <button type="button" className="clear-filter-btn" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <div className="list" tabIndex="0" aria-label="Filtered subcontractor results">
        {sorted.map(sub => (
          <div
            key={sub.id}
            className={'sub-card' + (sub.id === selectedId ? ' selected' : '')}
            onClick={() => setSelectedId(sub.id)}
          >
            <div className="sub-name-row">
              <div className="sub-name">{sub.companyName}</div>
              {sub._dist != null && sub._dist !== Infinity && (
                <span className="sub-dist">{sub._dist.toFixed(0)} mi</span>
              )}
            </div>
            <div className="sub-meta">
              <StatusPill status={sub.status} />
              <ApproxChip sub={sub} />
              {sub.city && <span className="sub-city">{sub.city}, {sub.state}</span>}
            </div>
            {sub.canonicalServices?.length > 0 && (
              <div className="sub-services">
                {sub.canonicalServices.map(service => (
                  <span key={service} className="mini-chip">{service}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        {!sorted.length && (
          <div className="empty-results">No subcontractors match the selected filters.</div>
        )}
      </div>
    </aside>
  )
}
