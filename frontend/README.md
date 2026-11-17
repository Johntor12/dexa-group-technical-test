# DexaWork Frontend

React.js with TypeScript for employee WFH attendance and HRD employee/attendance management. The frontend is a browser SPA built with Webpack and Tailwind CSS v4; it does not use Vite. See the [root project overview](../README.md), [backend runbook](../backend/README.md), and [current product scope](../backend/docs/CURRENT_PRODUCT_SPEC.md).

## UI architecture

~~~mermaid
flowchart TD
  Main[src/main.tsx] --> App[src/App.tsx: route and page state]
  App --> Auth[auth components]
  App --> Layout[workspace layout and sidebar]
  App --> Attendance[attendance capture, session, history and claims]
  App --> Employees[employee forms]
  App --> Records[HRD employee and attendance tables]
  App --> UI[shared buttons, fields, tables, modals and status]
  App --> API[src/lib/api.ts]
  API -->|HTTPS REST /api/v1| Backend[NestJS API Gateway]
~~~

Feature UI is organized under src/components/auth, layout, attendance, employees, records, dashboard, profile, and ui. App.tsx currently owns client-side path resolution, view state, API orchestration, and workflow state. The components present and collect feature-specific data; the backend remains authoritative for identity, timestamps and permissions.

## Implemented flows

- **HRD:** dashboard → employee list → add/edit/deactivate employee → copy an activation link for the employee → monitoring, attendance detail and private evidence.
- **Employee activation:** open the one-time activation URL → set a password → sign in.
- **Password recovery:** request a reset link from the sign-in page → set a new password using the single-use link. In local development, the link appears in the page and Employee Service log; production sends it by email.
- **Password change:** from Profile, verify the current password and set a new one. All active sessions are revoked, so sign in again afterward.
- **Employee WFH:** check-in with one live work-proof capture (screen or workspace) and a separate selfie → active session → check out with a new proof/selfie pair and an optional activity description. If checkout is missed, the backend closes the session after eight hours.
- **Forgotten check-in:** employee files a claim for an eligible past date with a photo or PDF of work progress (maximum 5 MiB) → a reviewer with an explicit department grant reviews the claim and attachment → approval/rejection is recorded separately from original attendance.

Capture evidence is for human review. The browser may display its device time as an overlay, but the server sets the official event times. The flow does not collect work tasks, WFH reason, or continuous location data. Browser camera/display access requires permission and a secure context (HTTPS or localhost).

Routes are client-side paths: public auth pages include /, /activate/:token, /forgot-password and /reset-password/:token. Employee pages include /app, /app/check-in, /app/check-in/success, /app/check-in/missed, /app/check-out, /app/check-out/success, /app/check-out/automatic, /app/attendance/history and /app/profile. HRD pages include /hr, /hr/employees, /hr/employees/new, /hr/attendance, /hr/attendance/today and /hr/attendance/claims, plus detail/profile routes. Refreshing a protected path requires an active in-memory session; the user may need to sign in again after a full reload.

## Styling and assets

Tailwind CSS v4 is processed by PostCSS in the Webpack pipeline. The stylesheet entry is src/index.css: it imports Tailwind, declares the Dexa theme and Plus Jakarta Sans, and contains shared component selectors implemented primarily with Tailwind @apply. Page components also use Tailwind utilities. This repository currently centralizes many shared selectors in index.css; it is not accurate to describe every style as an inline utility class. Layout uses viewport-relative sizing with clamp and responsive breakpoints where appropriate. Figma-derived icons/assets live under src/assets/icons.

## Local development

From frontend/:

~~~powershell
npm ci
Copy-Item .env.example .env
# API_URL defaults to http://localhost:3000/api/v1 for local development.
npm start
~~~

The dev server opens at http://localhost:5173 and supports client-side route fallback. Start all backend services and the development MySQL database first; see the [backend runbook](../backend/README.md).

## Build and checks

~~~powershell
npm run typecheck
npm run lint
npm run build
~~~

Webpack writes production assets to dist/. A production build deliberately requires API_URL to be configured and rejects localhost; set the public backend URL before building. API_URL is compiled into the browser bundle and must never contain a secret.

## Vercel deployment

The checked-in vercel.json sets the frontend root output directory to dist and rewrites SPA routes to index.html.

1. Set the Vercel project Root Directory to frontend.
2. Set Production environment variable API_URL to https://<backend-domain>/api/v1.
3. Deploy/redeploy the frontend after changing API_URL.
4. Configure the backend CORS_ORIGIN to allow the deployed frontend origin.

The backend must be publicly reachable over HTTPS, its readiness route should be healthy, and Supabase/object-storage secrets belong only in the backend environment. Never place database or storage credentials in Vercel frontend variables.

## Browser E2E

~~~powershell
npm run test:e2e
~~~

The browser runner requires Chrome, a built backend, and a seeded disposable development database. It starts temporary backend/frontend ports and writes synthetic test records. It is not a production test and may request camera/display permissions through browser automation.
