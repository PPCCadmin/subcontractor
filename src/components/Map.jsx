import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import * as turf from '@turf/turf'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

const STATUS_COLOR_EXPR = [
  'match', ['get', 'status'],
  'Vetted',      '#1a5c38',
  'Recommended', '#ca8a04',
  'New',         '#2563eb',
  'DNU',         '#dc2626',
  'Do Not Use',  '#dc2626',
  /* default */  '#2563eb'
]

export default function MapView({ subs, filteredIds, jobLocation, radius, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const jobMarkerRef = useRef(null)
  const prevSelectedRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-96.5, 39.5],
      zoom: 3.6,
      attributionControl: { compact: true }
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource('radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'radius-fill', type: 'fill', source: 'radius',
        paint: { 'fill-color': '#1a5c38', 'fill-opacity': 0.07 }
      })
      map.addLayer({
        id: 'radius-line', type: 'line', source: 'radius',
        paint: { 'line-color': '#1a5c38', 'line-width': 2, 'line-opacity': 0.55 }
      })

      map.addSource('subs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.addLayer({
        id: 'subs-selected-halo',
        type: 'circle',
        source: 'subs',
        filter: ['==', ['id'], -1],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 18, 8, 26, 14, 36],
          'circle-color': '#1a5c38',
          'circle-opacity': 0.35,
          'circle-blur': 0.4
        }
      })

      map.addLayer({
        id: 'subs-pin',
        type: 'circle',
        source: 'subs',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            3, ['case', ['boolean', ['feature-state', 'selected'], false], 10, 5],
            8, ['case', ['boolean', ['feature-state', 'selected'], false], 14, 8],
            14, ['case', ['boolean', ['feature-state', 'selected'], false], 20, 12]
          ],
          'circle-color': STATUS_COLOR_EXPR,
          'circle-stroke-width': [
            'case', ['boolean', ['feature-state', 'selected'], false], 4, 2
          ],
          'circle-stroke-color': [
            'case', ['boolean', ['feature-state', 'selected'], false], '#1a5c38', '#ffffff'
          ]
        }
      })

      map.on('click', 'subs-pin', (e) => {
        if (e.features && e.features[0]) onSelect(e.features[0].properties.id)
      })
      map.on('mouseenter', 'subs-pin', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'subs-pin', () => { map.getCanvas().style.cursor = '' })

      setMapLoaded(true)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const src = map.getSource('subs')
    if (!src) return

    const wanted = new Set(filteredIds)
    const features = []
    for (const s of subs) {
      if (!wanted.has(s.id)) continue
      if (s.lat == null || s.lng == null) continue
      features.push({
        type: 'Feature',
        id: s._numericId,
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { id: s.id, status: s.status || 'New', name: s.companyName }
      })
    }
    src.setData({ type: 'FeatureCollection', features })
  }, [subs, filteredIds, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const prev = prevSelectedRef.current
    if (prev != null) {
      try { map.setFeatureState({ source: 'subs', id: prev }, { selected: false }) } catch (e) {}
    }
    if (selectedId) {
      const sub = subs.find(s => s.id === selectedId)
      if (sub && sub._numericId != null) {
        try { map.setFeatureState({ source: 'subs', id: sub._numericId }, { selected: true }) } catch (e) {}
        prevSelectedRef.current = sub._numericId
        try { map.setFilter('subs-selected-halo', ['==', ['id'], sub._numericId]) } catch (e) {}
        if (sub.lat != null && sub.lng != null) {
          map.flyTo({ center: [sub.lng, sub.lat], zoom: 9, speed: 1.4, curve: 1.6, essential: true })
        }
      }
    } else {
      prevSelectedRef.current = null
      try { map.setFilter('subs-selected-halo', ['==', ['id'], -1]) } catch (e) {}
    }
  }, [selectedId, subs, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (jobMarkerRef.current) {
      jobMarkerRef.current.remove()
      jobMarkerRef.current = null
    }
    if (jobLocation) {
      const el = document.createElement('div')
      el.className = 'pin-job'
      el.innerText = '\u2605'
      jobMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([jobLocation.lng, jobLocation.lat])
        .addTo(map)
      map.flyTo({
        center: [jobLocation.lng, jobLocation.lat],
        zoom: Math.max(5, 9 - Math.log10(radius)),
        essential: true
      })
    }
    const src = map.getSource('radius')
    if (src) {
      if (jobLocation) {
        const circle = turf.circle([jobLocation.lng, jobLocation.lat], radius, { steps: 96, units: 'miles' })
        src.setData({ type: 'FeatureCollection', features: [circle] })
      } else {
        src.setData({ type: 'FeatureCollection', features: [] })
      }
    }
  }, [jobLocation, radius, mapLoaded])

  return <div id="map" ref={containerRef} />
}