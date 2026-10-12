# Heartland Paving - Subcontractor CRM (MVP)

A Heartland-owned subcontractor intelligence platform built from the June 11 & July 8 BRD sessions.

## Quick Start
```bash
npm install
npm run dev
```
Opens at http://localhost:5173. This starts the API server (port 3001, saving to `./.data`) and the Vite dev server together.

There is no Microsoft sign-in locally. To preview as a user, run this in the browser console and reload:
`localStorage.setItem('dev-user-email', 'luke.norvid@heartlandpavingpartners.com')`
(remove it with `localStorage.removeItem('dev-user-email')` to see the read-only view).

## Build
```bash
npm run build && npm start
```

## Tech Stack
- React 18 + Vite
- MapLibre GL JS (OpenFreeMap Liberty vector tiles - no API key)
- Turf.js for geospatial math
- Nominatim (OpenStreetMap) for geocoding
- Node/Express server (`server/`) serving the app and a JSON API
- Azure Blob Storage for saved edits and ratings

## Data
1,287 subcontractors preloaded in public/subcontractors.json.
Edits never change that file: each edited or added subcontractor is saved as its own JSON document in storage and merged over the seed data when the app loads.

## Who can edit
Only admins can add, import, edit or rate subcontractors; everyone else is read-only. The server enforces this on every change.
- Admin emails: `ADMIN_EMAILS` in `server/auth.js`, or the `ADMIN_EMAILS` environment variable (comma-separated) on the container app.
- Or assign users the `SubcontractorEditor` app role in Entra ID.

This relies on Azure Container Apps authentication (Easy Auth) being enabled and requiring sign-in, so the server can trust the signed-in user header.

## Saving edits (server storage)
| Setting | Effect |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Save to Azure Blob Storage (container `subcontractors`, override with `STORAGE_CONTAINER`) |
| `DATA_DIR` | Save JSON files to that folder (local dev, or an Azure Files mount) |
| neither | App runs read-only; admins see a banner that saving isn't set up |

## Features (Phase 1 MVP)
- Apple-Maps style vector map with color-coded status pins
- Job location by address search OR click on map
- Radius search (5-500 miles) with visible circle
- Multi-select service and status filters
- Full sub detail: contacts, services, COI GL/Auto/WC dates, W-9, MSA, star rating, notes
- Edits auto-save to the server
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
Open http://localhost:8080 (read-only unless you pass `-e AZURE_STORAGE_CONNECTION_STRING=...` or `-e DATA_DIR=...`)

Stop:
```bash
docker compose down
```
