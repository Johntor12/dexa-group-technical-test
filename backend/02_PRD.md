# PharmaWork Backend — Product Requirements Document (PRD)

> **Status: Initial baseline, retained for traceability.** The application has evolved through later approved changes, including live check-in/check-out evidence and missed-check-in claims. This file is not the current acceptance contract; see [the current product scope](docs/CURRENT_PRODUCT_SPEC.md) and [current API/RPC contracts](docs/API_RPC_CONTRACTS.md).

**Version:** 1.0 | **Priority:** Fullstack skill-test MVP | **Backend:** TypeScript/NestJS | **Database:** MySQL

See [BRD](./01_BRD.md) for source-backed requirements; see [Architecture](./03_ARCHITECTURE.md) and [API + Data](./04_API_AND_DATA.md) for implementation contracts.

## 1. Product objective
Provide a secure HTTP API consumed by React for (1) employee authentication, (2) WFH attendance with server timestamp plus image evidence, (3) HRD employee master CRUD, and (4) read-only HRD attendance monitoring. Demonstrate NestJS microservices concepts with distinct running services. Initial implementation has two roles: `EMPLOYEE` and `HRD`.

## 2. Prioritization
- **P0:** Test-mandatory path; failure blocks completion.
- **P1:** Security, reliability and demonstration quality; implement alongside P0 where necessary.
- **P2:** Optional, only after P0/P1 pass.

## 3. Functional requirements
| ID | Priority | Requirement | Acceptance criteria / test |
|---|---|---|---|
| FR-01 | P0 | User login | Valid credentials create authenticated session; bad credentials return 401 with generic message |
| FR-02 | P0 | Role-based access | EMPLOYEE cannot call HRD employee CRUD/monitoring; HRD cannot mutate attendance |
| FR-03 | P0 | Create employee | HRD creates user + employee master atomically; unique email/employeeNumber; validated payload |
| FR-04 | P0 | Read employees | HRD paginated/searchable list and detail; excludes passwordHash |
| FR-05 | P0 | Update employee | HRD edits allowed master fields; audit event records actor/change |
| FR-06 | P0 | Delete employee | HRD deactivates employee/account; history remains; disabled login is denied |
| FR-07 | P0 | Submit WFH attendance | Authenticated Employee submits image; server determines date/time; persisted record returned |
| FR-08 | P0 | Evidence image | Validate mime/signature/size; store privately; relate one image to attendance |
| FR-09 | P0 | HRD monitoring | HRD lists and details all submitted attendance, filtered by date/department/employee |
| FR-10 | P0 | HRD view-only | No attendance mutation routes for HRD; service enforces the same restriction |
| FR-11 | P0 | Database | MySQL migration, relational constraints and FK; app connects successfully |
| FR-12 | P0 | Microservices concept | Separate Gateway, Employee Service and Attendance Service processes; TCP RPC demonstrated |
| FR-13 | P1 | My attendance | Employee sees only own submissions |
| FR-14 | P1 | Idempotency | Duplicate request same key returns prior result; new key same day returns 409; no duplicate rows |
| FR-15 | P1 | Image access security | Only employee owner or HRD can retrieve photo via authenticated endpoint |
| FR-16 | P1 | Standard errors | Consistent error code/message/requestId and correct HTTP status |
| FR-17 | P1 | OpenAPI | Swagger for public API, including multipart example and error responses |
| FR-18 | P1 | Diagnostics | Health endpoints, request IDs, structured logs, RPC timeouts |
| FR-19 | P1 | Testing | Automated tests for login, CRUD, upload, duplicate attendance, read-only HRD, owner scope |
| FR-20 | P2 | Redis/BullMQ, ERP | Deferred; no implementation required for skill test |

## 4. Nonfunctional requirements
| ID | Quality | Requirement / verification |
|---|---|---|
| NFR-01 | Security | Password hashes (Argon2id/bcrypt), secure auth cookies or bearer policy, CSRF protections if cookies, validate input |
| NFR-02 | Privacy | Evidence in private storage, not public static URLs, redact secrets/PII from logs |
| NFR-03 | Data correctness | Server UTC timestamp, `workDate` derived in Asia/Jakarta; DB unique(employeeId,workDate) |
| NFR-04 | Reliability | MySQL transaction for attendance/evidence metadata, file cleanup/reconciliation and retry key persistence |
| NFR-05 | Operability | `docker compose` for DB/dev services, `.env.example`, migration and seed docs |
| NFR-06 | Maintainability | Feature modules, DTO validation, dependency injection, repository isolation, API contracts |
| NFR-07 | Performance | Avoid N+1; pagination default 20/max 100; no numeric SLA asserted without load testing |
| NFR-08 | Accessibility (frontend contract) | Stable error field names, human-readable messages; WCAG 2.2 AA is frontend target |
| NFR-09 | Portability | Document Node/Prisma compatibility, bind microservice ports to private network only |

## 5. User stories
### US-01: Employee login
**As** an Employee, **I want** to log in, **so that** my attendance is associated with my account.
- Given an active account and correct password, when logging in, then identity/role are established.
- Given an inactive employee or invalid password, when logging in, then access is denied without exposing the reason.

### US-02: WFH attendance + photo
**As** an Employee, **I want** to submit an attendance photo, **so that** HRD can see proof and the recorded submission time.
- Given logged in and valid image, when POST multipart succeeds, then attendance and image metadata exist.
- The returned timestamp was generated by backend; no client timestamp accepted.
- Given no image/invalid MIME/too large, when submit, then 400/413/422 as documented; no attendance saved.
- Given a same-day prior record, when submitting with new key, then 409.
- Given a replay with same key and same payload, then identical result without a second record.

### US-03: HRD master management
**As** HRD, **I want** to create, view, update and deactivate employees, **so that** account master data stays accurate.
- Must reject duplicated email/employee number and invalid department.
- Must never return password hash in DTO.
- Must not cascade-delete historical attendance.

### US-04: HRD monitoring
**As** HRD, **I want** to view time and evidence of attendance, **so that** I can monitor submitted records.
- Filter/paginate records and view image; mutations against attendance are forbidden.
- Employee accounts can only see their own attendance.

## 6. User and domain states
**Authentication:** unauthenticated → authenticated → expired/logged out.

**Attendance:** `NOT_SUBMITTED` (derived) → `SUBMITTED` (persisted record), with immutable submitted time and evidence. No `CHECKED_OUT` in test MVP.

**Employee:** `ACTIVE` → `INACTIVE`; inactive accounts cannot authenticate; existing attendance remains available to authorized HRD.

**Evidence upload:** `STAGED` → `COMMITTED` (reference saved), or `STAGED` → `CLEANED` on error. Garbage collection handles abandoned staged files.

## 7. Edge cases
- Employee clicks submit twice / browser retries / RPC timeout after DB commit.
- Midnight transition between upload start and DB write; authoritative `workDate` derived from the actual persisted submission event.
- HTTP response lost after successful attendance persistence; client retains same idempotency key and fetches status.
- Invalid file masquerading as JPEG; signature/type check and optional re-encoding.
- Service crash after writing temporary photo; orphan cleanup job.
- HRD user tries guessed PATCH/DELETE attendance URL; 404/405/403 at gateway, explicit deny at service.
- Concurrent employee create with duplicate email: DB unique constraint determines winner.
- Employee inactive after login: short session expiry + re-check active state on critical submission.
- Extremely large upload rejected by gateway/proxy before full buffering.

## 8. API contract principles
- Versioned gateway prefix `/api/v1`.
- Public REST; private TCP message patterns with shared contracts.
- Error payload: `{ statusCode, code, message, requestId, details? }` (details only safe validation data).
- Query-list response: `{ data: [], meta: { page, limit, total, totalPages } }`.
- All timestamps ISO 8601 UTC, local date `YYYY-MM-DD`, explicit `Asia/Jakarta` zone.
- File upload field `photo`; maximum **5 MiB** as a design choice (not the test brief).
- One photo and one attendance per employee per `workDate` in MVP.

## 9. Scope guardrails for AI coding agents
1. Do **not** replace MySQL with PostgreSQL merely because it is familiar.
2. Do **not** implement only a single NestJS REST process while claiming a microservices demonstration.
3. Do **not** remove the mandatory photo upload.
4. Do **not** allow HRD to edit attendance.
5. Do **not** make WFO/hybrid scheduler/ERP/Redis a prerequisite for completion.
6. Do **not** return success before the attendance and evidence are durably confirmed.
7. Do **not** use browser clock as authoritative attendance time.
8. Do **not** expose the photo storage directory publicly.
9. Do **not** create fake employee metrics or production data in demo.

## 10. Definition of done
- P0 and security-critical P1 requirements verified by test and manual end-to-end demo.
- MySQL migration and seed procedure reproducible from README.
- Gateway/Employee/Attendance running as distinct processes.
- Multipart upload, read-only monitoring, private photo access, and duplicate protection tested.
- No unresolved high-severity auth/authorization/file vulnerabilities.
- README and API docs allow another developer to run and verify independently.

## 11. Five-day build scope
**Day 1:** workspace, MySQL, Prisma, auth, Employee Service.
**Day 2:** employee CRUD, attendance model, file validation/storage.
**Day 3:** Gateway and React integration, HR monitoring.
**Day 4:** full tests, concurrency edge cases, docs.
**Day 5 (buffer only):** stability, packaging, demo. This is prioritization rather than a guaranteed estimate.
