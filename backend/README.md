# DexaWork Backend

NestJS TypeScript backend for employee account lifecycle, WFH attendance and HRD read-only monitoring. This README describes the current repository implementation; it replaces older setup claims in the original backend README but does not rewrite the initial source PRD or architecture blueprint.

- Current product scope: [docs/CURRENT_PRODUCT_SPEC.md](docs/CURRENT_PRODUCT_SPEC.md)
- Full runtime architecture and ERD: [docs/ARCHITECTURE_AND_ERD.md](docs/ARCHITECTURE_AND_ERD.md)
- HTTP and TCP RPC contracts: [docs/API_RPC_CONTRACTS.md](docs/API_RPC_CONTRACTS.md)
- Module map: [docs/MODULE_MAP.md](docs/MODULE_MAP.md)
- Schema ownership: [docs/DATA_OWNERSHIP.md](docs/DATA_OWNERSHIP.md)
- Clean-code audit: [docs/CLEAN_CODE_AUDIT.md](docs/CLEAN_CODE_AUDIT.md)
- [Frontend README](../frontend/README.md) · [Root project overview](../README.md)

The files 02_PRD.md and 03_ARCHITECTURE.md are initial baseline documents. Approved feature changes have since evolved the running application; use the as-built documents above for current routes, data and behavior.

## Product requirements snapshot

| Actor | Current capability |
|---|---|
| Employee | Activate account, sign in, check in/out with work-proof and selfie captures, view own records/evidence, claim a forgotten check-in for a prior workday. |
| HRD | Create/edit/deactivate employee accounts, view attendance and evidence without editing original attendance. |
| Granted reviewer | Review missed-check-in claims only for departments explicitly granted to that HRD account. |

The employee session is server-timestamped. A missing manual check-out is closed at the eight-hour due time. A missed-check-in claim is a separate record and approval does not edit an original attendance. Direct WFH submission does not collect tasks, location or WFH reason. See the current product spec for acceptance behavior and boundaries.

## Runtime architecture

~~~mermaid
flowchart LR
  Browser[React TypeScript SPA] -->|HTTPS REST and multipart| Gateway[API Gateway :3000]
  Gateway -->|TCP RPC :4001| Employee[Employee Service]
  Gateway -->|TCP RPC :4002| Attendance[Attendance Service]
  Attendance -->|TCP RPC identity/reviewer checks| Employee
  Employee --> MySQL[(Shared MySQL or TiDB)]
  Attendance --> MySQL
  Gateway --> PrivateStorage[(Private evidence storage)]
  Attendance --> PrivateStorage
~~~

The applications are separate NestJS processes but currently start together through npm start and share a database instance. This is a transitional microservice-style boundary, not isolated service databases. Production evidence storage uses Supabase Storage when PHOTO_STORAGE_PROVIDER=supabase; the bucket must be private. Development defaults to local storage.

## Data model overview

~~~mermaid
erDiagram
  USER ||--o| EMPLOYEE : account
  USER ||--o{ SESSION : sessions
  USER ||--o| ACTIVATION_TOKEN : activation
  USER ||--o{ MISSED_CHECK_IN_REVIEW_GRANT : permissions
  EMPLOYEE ||--o{ ATTENDANCE : sessions
  EMPLOYEE ||--o{ MISSED_CHECK_IN_CLAIM : claims
  ATTENDANCE ||--o{ EVIDENCE : evidence
  ATTENDANCE ||--o| IDEMPOTENCY : retry
  USER o|--o{ MISSED_CHECK_IN_CLAIM : reviews
  ATTENDANCE o|--o| MISSED_CHECK_IN_CLAIM : approved_attendance
~~~

The global employee number format is DEXA-{YYYY}-{DD}-{NNNN}: four-digit hire year, two-digit department code, four-digit company-wide sequence. Department and role are enums. See the full [ERD and model notes](docs/ARCHITECTURE_AND_ERD.md) and [data ownership](docs/DATA_OWNERSHIP.md).

## Backend structure

~~~text
backend/
├── apps/
│   ├── api-gateway/       # public HTTP, auth guard, DTO validation, REST-to-RPC, multipart/evidence
│   ├── employee-service/  # credentials, sessions, employee lifecycle, activation, audit
│   └── attendance-service/# attendance, claims, evidence cleanup, scheduled auto-checkout
├── libs/
│   ├── contracts/         # DTOs, enums, Principal, RPC envelope and pattern names
│   └── common/            # database, RPC, storage, time, errors, config, validation
├── prisma/                # schema, additive migrations and synthetic seed data
└── docs/                  # current product and engineering documentation
~~~

backend/src is the old Nest starter scaffold, excluded from the runtime build. New backend work belongs in apps/ or genuinely shared libs/; the distinction and remaining clean-code gaps are documented in the [audit](docs/CLEAN_CODE_AUDIT.md).

## Local development

Requirements: Node.js compatible with the locked Prisma version (the repository was verified on Node 26.13.1), npm, and MySQL 8. The isolated Windows helper starts the already-initialized local MySQL instance on 127.0.0.1:3308; it does not modify a system-wide MySQL service.

From backend/ on the configured development workstation:

~~~powershell
npm ci
Copy-Item .env.development.example .env.development
# Set a loopback DATABASE_URL, distinct JWT_SECRET and RPC_SECRET (32+ chars),
# and SEED_PASSWORD (12–72 bytes) in .env.development.
npm run db:start:local
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed:dev
npm run start:dev
~~~

For a new machine, use infra/docker-compose.yml with values from a local-only .env file (never commit it), and set .env.development's DATABASE_URL to the published MySQL port. The guarded development loader reads .env.development and rejects non-loopback database hosts. Do not use the development scripts against cloud databases.

npm run start:dev starts Gateway, Employee Service, and Attendance Service together. To run separate terminals, use npm run start:dev:gateway, npm run start:dev:employee, and npm run start:dev:attendance. npm start starts the three built processes and requires npm run build first.

| URL | Purpose |
|---|---|
| http://localhost:3000/api/v1 | REST API base |
| http://localhost:3000/api/docs | Swagger UI |
| http://localhost:3000/health | Gateway liveness |
| http://localhost:3000/health/ready | Downstream/database readiness |

## Seed data

The development seeder creates one HRD administrator, one IT claim reviewer, and 40 synthetic employee accounts (four per department). It is idempotent for those seed identities, preserves existing password hashes, and does not reset or truncate the database. New seed accounts use SEED_PASSWORD; email identities are configurable with SEED_HRD_EMAIL, SEED_EMPLOYEE_EMAIL, and SEED_REVIEWER_EMAIL. Never publish real passwords or put production credentials in documentation.

Production seeding is not part of a normal deploy. It is available only for an explicitly approved dummy-data environment using npm run prisma:seed:prod with NODE_ENV=production, the production database configuration, and intentional SEED_* values. It does not reset the database. Do not point it at a real employee dataset.

## Verification

~~~powershell
npm run lint
npm run build
npm test
# Optional DB-backed process smoke flow:
npm run test:e2e
~~~

Verified for the current code snapshot on 17 November 2026: backend lint passed with zero warnings/errors, TypeScript/Prisma build passed, and 4 Vitest unit tests passed. The DB-backed E2E command was not run during this documentation audit. It writes synthetic records to the configured development database; use a disposable/demo database.

## Production deployment

The current hosting shape runs all three backend processes in one Render service. Only the HTTP Gateway binds publicly (PORT, 0.0.0.0); TCP listeners 4001 and 4002 bind to loopback and must not be exposed. The Vercel SPA uses API_URL=https://<backend-domain>/api/v1; backend CORS_ORIGIN must include the exact frontend origin.

Typical Render commands:

- Build: npm ci --include=dev && npm run build
- Start: npm start
- Release migration: npm run prisma:migrate:deploy:prod

Copy variable names from [.env.production.example](.env.production.example) into the host's environment settings. Use distinct strong production secrets and the mounted TiDB CA path. Do not put secret values in Git, frontend variables, README files, or logs. Supabase variables are server-side only; configure a private bucket named by SUPABASE_STORAGE_BUCKET and allow JPEG/PNG/WebP/PDF up to 5 MiB. Apply only additive migrations through the release command; database reset is not a deployment step. The migration `20261117180000_claim_evidence_checkout_activity` adds nullable checkout activity text and a claim attachment metadata table without deleting existing rows.

## API and service policies

Read [API_RPC_CONTRACTS.md](docs/API_RPC_CONTRACTS.md) for current routes, payloads, RPC patterns, error format and request ID propagation. Read [DATA_OWNERSHIP.md](docs/DATA_OWNERSHIP.md) for logical ownership and the known shared-database read coupling. HRD attendance remains read-only; evidence retrieval remains owner/HRD authorized; server timestamps remain authoritative.

## Known operational limits

- The HRD monitoring read projection currently accesses a limited Employee/User projection from the shared database inside Attendance Service. It is read-only but is a cross-service coupling to resolve before independent database deployment.
- The login rate limiter is in-memory per Gateway process; horizontal scaling requires a shared limiter.
- Render Free may sleep between requests; a cold start and cross-region database round trip cannot be made equivalent to localhost by code changes alone.
- No production load-test SLA, automated backups, or distributed tracing claim is made here.
