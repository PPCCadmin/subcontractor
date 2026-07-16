# Heartland Paving - Subcontractor CRM (MVP)

A Heartland-owned subcontractor intelligence platform built from the June 11 & July 8 BRD sessions.

## Quick Start
```bash
npm install
npm run dev
```
Opens at http://localhost:5173

## Build
```bash
npm run build && npm run preview
```

## Tech Stack
- React 18 + Vite
- MapLibre GL JS (OpenFreeMap Liberty vector tiles - no API key)
- Turf.js for geospatial math
- Nominatim (OpenStreetMap) for geocoding
- localStorage persistence (key: hpp-subs-v1)

## Data
1,287 subcontractors preloaded in public/subcontractors.json.
To reset edits: DevTools console -> localStorage.removeItem('hpp-subs-v1') -> reload.

## Features (Phase 1 MVP)
- Apple-Maps style vector map with color-coded status pins
- Job location by address search OR click on map
- Radius search (5-500 miles) with visible circle
- Multi-select service and status filters
- Full sub detail: contacts, services, COI GL/Auto/WC dates, W-9, MSA, star rating, notes
- Auto-saved edits to localStorage
- Distance-sorted results

## Status Colors
- Vetted (green) - Verified good performer
- New (blue) - Contract sent, not yet reviewed
- Unknown (gray) - Needs vetting
- Do Not Use (red) - Excluded
- Competitor (orange) - Acquired by Rose Paving / Atlantic Southern / etc.

## Service Taxonomy
Milling, Asphalt, Asphalt Plant, Concrete, Concrete Plant, Sealcoat, Striping, Crack Fill, Patching, Testing

## Roadmap (Phase 2+)
- COI/W-9 file attachments (3-5 year retention)
- Monthly expiration email report to Lisa
- Admin permissions on Status field
- Awarded work checkbox with auto-vet
- Contractor rating form intake
- Project threshold flags (Maintenance / <$100k / $100k-$300k / Capital)
- OneCrew integration for execution tracking
- CSV/XLSX import for Lisa

Built for Todd, Lisa, Jim, Bill, Austin, Kirsten & the HPP team.

## Run with Docker
```bash
docker compose up --build -d
```
Open http://localhost:8080

Stop:
```bash
docker compose down
```
