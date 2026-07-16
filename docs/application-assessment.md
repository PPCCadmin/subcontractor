---
type: application-assessment
mode: handoff
app: Subcontractor Management
repo: https://github.com/PPCCadmin/subcontractor
assessed-at-commit: 18064bd
assessed-on: 2026-07-15
maintainer: Luke Norvid
---

# Subcontractor Management — Application Assessment

## What it does
Internal directory of HPP's ~1,200 active subcontractors with search, filter, and Apple Maps-style pin view. Replaces the shared spreadsheet the BUs were passing around. CSV import with dedupe and manual add-sub modal.

## Users
PMs, estimators, and BU leads across all nine business units. Currently public (test); Entra sign-in planned before broad rollout.

## Tech stack
- React 19 + Vite 8 + Tailwind, built into a static SPA
- Served by Nginx (`nginx:stable-alpine`) in a Docker container
- Hosted on Azure Container Apps, resource group `hpp-static-webapps-rg`
- Registry: `coaltarcheckeracr.azurecr.io` (shared with Coal Tar Checker)
- CI/CD: GitHub Actions `subcontractor-management-AutoDeployTrigger-*.yml` → Docker build → ACR → new Container App revision

## Auth
Public test deployment today. `hpp-subcontractor-auth` Entra app registration needed before rollout.

## Data
No persistent backend yet. In-session only; CSV imports the user provides.

## Health
`/health` served by Nginx, returns 200 ok.

## Known gaps
- No persistent backend — data doesn't survive refresh across users
- No Entra sign-in yet
- No automated tests
- No COI / W-9 / prequal fields yet
