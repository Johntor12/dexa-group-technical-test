# API and implementation decisions

This fills in payload details not present in the supplied PRD/architecture. It does not replace the unavailable source PDF or API/Data specification.

## HTTP contract

Base: `/api/v1`. JSON bodies reject unknown properties. Bearer tokens are issued by Gateway after Employee Service verifies credentials and persists a session. Sessions expire after one hour, are revoked on logout/password change/deactivation, and are rechecked on every authenticated request. Browser tokens stay in memory, not persistent storage. Cookies are not used.

| Method | Route | Access |
|---|---|---|
| POST | /auth/login | Public; 20 attempts/IP/minute |
| POST | /auth/logout | Authenticated |
| GET | /auth/me | Authenticated |
| GET, POST | /employees | HRD |
| GET | /employees/departments | HRD |
| GET, PATCH, DELETE | /employees/:id | HRD; DELETE deactivates |
| POST | /attendances | Employee |
| GET | /attendances | HRD |
| GET | /attendances/me | Employee |
| GET | /attendances/me/today | Employee; null if not submitted |
| GET | /attendances/:id | Owner or HRD |
| GET | /attendances/:id/evidence | Owner or HRD |

There are no attendance update/delete routes. Department listing is an implementation addition supporting employee forms. Department creation/maintenance is seed-driven in this MVP.

Login JSON:

```json
{"email":"employee@example.test","password":"your-local-seed-password"}
```

Response: `{ accessToken, expiresAt, user }`. Use `Authorization: Bearer <accessToken>`. Credentials never appear in employee responses.

Create employee JSON:

```json
{
  "email": "new.employee@example.test",
  "password": "unique-password-12-or-more",
  "employeeNumber": "EMP-002",
  "fullName": "New Employee",
  "departmentId": "a-valid-department-uuid",
  "position": "Developer"
}
```

PATCH accepts the same fields optionally. Role cannot be supplied; HRD cannot create another HRD through employee CRUD. Seed provisions the initial HRD. Password hashing uses bcrypt cost 12; maximum 72 bytes to avoid silent bcrypt truncation.

Lists accept `page` (default 1), `limit` (default 20, maximum 100), `search`, and `departmentId`. Attendance additionally accepts `date` (YYYY-MM-DD) and `employeeId` for HRD. Employee self queries always force the verified owner regardless of requested employeeId. Historical attendance stores employee/department snapshots at submission, so later profile changes do not rewrite history.

List response:

```json
{"data":[],"meta":{"page":1,"limit":20,"total":0,"totalPages":0}}
```

Errors: `{ statusCode, code, message, requestId }`; validation messages may be an array. HTTP responses include X-Request-Id. Internal exceptions/DB messages are not returned. Generic unavailable responses use 503.

## Attendance and evidence

POST multipart field `photo`, header `Idempotency-Key` (1–100 ASCII letters/digits/underscore/hyphen). No other form fields: browser employeeId/date/time are rejected. JPEG/PNG/WebP, maximum 5 MiB, MIME must match magic bytes. Server chooses identity, UTC timestamp and Asia/Jakarta date.

- New submission: 201 and persisted attendance record.
- Same key + same photo: 200 and the original record.
- Same key + different photo, or a different key on the same day: 409.
- Missing photo: 400; oversize: 413; invalid signature/MIME: 422.
- Owner mismatch/HRD upload: 403; inactive/revoked session: 401.

Gateway stages bytes under a random UUID, flushes the file, and submits metadata through RPC. Attendance verifies file metadata and inserts attendance/evidence/idempotency in one transaction. Unique constraints arbitrate concurrent submissions. SQL migrations contain physical foreign keys; deactivation never deletes history.

Definitive 4xx rejection cleans up the newly staged file; successful replay cleans up its redundant file. 5xx/timeout leaves the file untouched because a commit may already have happened. The hourly sweeper checks aged files against committed evidence references; it removes only unreferenced files older than 24 hours. Database failures stop cleanup safely. The UI reuses its key while retrying the selected file; after refreshing, fetch today/status before another attempt.

Evidence is streamed only after authorization, with Content-Type, nosniff, and Cache-Control: no-store. No static/public storage route. The absolute storage directory is shared by Gateway and Attendance; deployment must mount the same private volume into both.

## RPC and ownership

Typed pattern names/envelopes are in libs/contracts. Receivers validate RPC_SECRET using constant-time comparison. The secret establishes a trusted service caller; original bearer token establishes the user. Authentication and role checks run again downstream. TCP ports default to loopback and must remain private if deployed.

Employee owns User, Session, Department, Employee, AuditEvent. Attendance owns Attendance, Evidence, Idempotency. Schema/migrations are centrally managed for this shared-database MVP; foreign keys couple service deployment. No distributed transactions, broker, Redis, ERP or checkout flow is introduced.

## Verification limits

Tests use real MySQL and separate child processes, not mock persistence. E2E records are explicitly synthetic and remain in the demo database. The outage test intentionally stops Attendance and may log ECONNRESET; it then verifies a sanitized 503. Browser screenshots and automated axe checks cover representative desktop/mobile pages, not every possible accessibility scenario.

Docker Compose is supplied but was not run because Docker is unavailable here. The existing native MySQL binary provided integration verification. Production TLS, secret management, DB least-privilege provisioning, backups, shared rate limiting and durable object storage remain deployment work.

## Attendance correction addendum (PW-PRD-ADD-001)

The new `/api/v1/attendance-corrections` routes are additive. Employees may list verified eligible days (`GET /eligible-days`), create a request (`POST /`, multipart `workDate`, `reason`, `evidence` plus `Idempotency-Key`), list their own requests (`GET /me`), inspect a request (`GET /:id`), cancel a pending request (`POST /:id/cancel`), and retrieve private retroactive evidence (`GET /:id/evidence/:evidenceId`). A user with an explicit `ATTENDANCE_CORRECTION_REVIEW` grant for the employee's department may use `GET /pending?status=PENDING|APPROVED|REJECTED`, `POST /:id/approve` (optional `note`), and `POST /:id/reject` (required `reason`, 20–1000 characters). Authorization is checked again inside Attendance Service; owners cannot review their own requests. Responses follow the existing error envelope.

`CorrectionEligibleDay` is an explicit WFH eligibility reference. Missing attendance without such a reference is unverified, not an absence. The configurable request window is `CORRECTION_WINDOW_DAYS` (default 7 calendar days, Asia/Jakarta). A pending request has a unique key per employee/date, while a separate idempotency key permits safe replay. A request after rejection carries `priorRejectedRequestId`. Final decisions atomically update the request, audit row, and, on approval, one linked attendance row with `source=CORRECTION`. Its `submittedAt` is the actual approval time. Late evidence remains in `AttendanceCorrectionEvidence`; direct attendance photos and existing attendance rows are not changed. The aged file sweeper protects both evidence tables.
