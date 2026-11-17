# Backend Clean-Code Audit

**Audit date:** 17 November 2026 · **Reference:** `PharmaWork_NestJS_Clean_Code_Engineering_Standards_v1.md`

The attached standard is treated as incremental engineering guidance, not as a request to rebuild the application. The audit preserves the current React → REST Gateway → TCP RPC → Employee/Attendance Service design, existing data model, API behavior and security boundaries.

## Summary

The active backend has a recognizable feature-first monorepo structure, explicit Nest runtime applications, strict TypeScript, DTO validation at both HTTP and TCP entry points, stable error handling, request-ID propagation, and clear role/evidence checks. It is **not fully aligned** with the reference yet: shared-database access blurs service ownership, repository wrappers expose Prisma directly, several use cases are composed in a large AttendanceService, and test coverage is thin for the number of security-sensitive flows.

## Standards conformance

| Area | Assessment | Repository evidence |
|---|---|---|
| Runtime boundaries | Aligned with documented compromise | Three Nest applications start as separate processes; TCP listeners are loopback-only. Production currently groups them in one Render service and shares MySQL/TiDB. |
| Feature organization | Mostly aligned | Active code is under `apps/api-gateway`, `apps/employee-service`, `apps/attendance-service`, with related attendance, claims, evidence, credentials and employee folders. |
| Controller responsibilities | Mostly aligned | Gateway routes translate HTTP to RPC; internal message controllers validate and delegate. Multipart capture staging/cleanup remains in the HTTP attendance controller because it owns file transport. |
| DTO and boundary validation | Aligned | Global HTTP `ValidationPipe` uses transform, whitelist and forbid-non-whitelisted; RPC handlers call the shared `validated()` helper. |
| Authorization and privacy | Aligned in key flows | Gateway and services validate session identity; attendance owner/HRD checks, HRD read-only behavior, private evidence, and explicit department reviewer grants are present. |
| Timestamp and idempotency invariants | Aligned | Server-generated timestamps, unique employee/work-date constraint, idempotency fingerprints and checkout race checks are implemented. |
| Error mapping and logs | Mostly aligned | Domain errors are serialized at RPC boundaries and mapped at HTTP; request ID and duration are logged without request bodies or credentials. Unexpected RPC errors are deliberately sanitized. |
| TypeScript hygiene | Improved and aligned for audited issues | `strict` is enabled. The untyped `any` claim mapper and default `any` RPC result were replaced by generated Prisma typing and `unknown`; lint now reports no warnings. |
| Persistence boundary | Needs improvement | `EmployeesRepository` and `AttendanceRepository` expose the Prisma client through a getter instead of owning queries. Claims service injects `Database` directly. These do not yet create an enforceable repository/port boundary. |
| Service data ownership | Needs improvement before independent DB rollout | Attendance HR monitoring queries read Employee/User records from the shared database. This is read-only and documented, but it is cross-service coupling. Shared credentials also mean ownership is conventional, not DB-enforced. |
| Test coverage | Needs improvement | Current unit suite contains four policy tests. A MySQL/process E2E runner exists, but service-level ownership, reviewer permissions, file failure/recovery and high-risk workflows need broader repeatable coverage. |
| Legacy source tree | Needs cleanup decision | `backend/src` is a Nest starter scaffold excluded from `tsconfig.build.json`; active runtime is under `apps/`. It is documented as inactive rather than deleted without checking its old specs/scripts consumers. |

## Small cleanup completed during this audit

- Replaced the claim response mapper's `any` input with `Prisma.MissedCheckInClaimGetPayload` based on its actual include projection.
- Changed the RPC client's default result type from `any` to `unknown` and made the authentication guard request `Principal` explicitly.
- Removed an unnecessary non-null assertion in the attendance owner filter.
- Removed unused imports and unused seed variables flagged by the configured linter.
- Added current-state architecture, ERD, product scope, API/RPC and ownership documentation. Historical PRD/architecture/first-iteration API documents were labeled rather than rewritten.

No attendance, employee, reviewer, authentication, schema ownership, or storage behavior was intentionally changed by these cleanup edits.

## Recommended follow-up, in order

1. **Make the reporting read boundary explicit.** Replace Attendance Service's direct Employee/User table access with a reviewed employee summary contract or a deliberate read-model adapter. Keep the current HR monitoring and missing-employee lists intact. Do this before splitting the shared database or credentials.
2. **Replace the Prisma-client getter facades with meaningful persistence methods** when touching those features. Avoid introducing generic repository frameworks; test the real use cases with a small, explicit interface only where it helps ownership or substitution.
3. **Separate attendance query/reporting orchestration from submission and checkout commands** after adding tests around HR summaries, paging, and record provenance. Keep the public API and current UI response contracts stable.
4. **Retire or archive `backend/src`** after confirming no tooling, examples, or contributor workflow still uses the starter scaffold.
5. **Expand automated coverage** for activation/revocation, ownership, reviewer department scope, evidence storage failure/replay cleanup, duplicate check-in, auto-checkout and HRD read-only access.

## Verification run for this audit

- `npm run lint` — passed, zero warnings and errors (47 files scanned).
- `npm run build` — passed; Prisma client generation and strict TypeScript compilation succeeded.
- `npm test` — passed, 1 Vitest file and 4 tests.
- `npm run test:e2e` — not run during this documentation/code-structure audit; it requires the local database and writes synthetic records.
- Production deployment, production database migration, and load/performance testing were not performed.
