# HTTP and TCP RPC Contracts

**Current contract snapshot:** 17 November 2026 · Public base path: `/api/v1`

All authenticated HTTP routes use `Authorization: Bearer <accessToken>`. Tokens are held in frontend memory and expire after one hour. Gateway HTTP validation rejects unknown request properties; internal TCP payloads are validated again by message handlers. Paginated list metadata is `{ page, limit, total, totalPages }`.

## Public HTTP API

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Verify credentials and establish a session. |
| `POST` | `/auth/activate` | Public, one-time token | Set password for an invited employee. |
| `GET` | `/auth/me` | Authenticated | Return current verified principal. |
| `POST` | `/auth/logout` | Authenticated | Revoke current session. |
| `GET` | `/employees` | HRD | Search/filter/paginate employees. |
| `POST` | `/employees` | HRD | Create employee and inactive account; returns activation token once. |
| `GET` | `/employees/departments` | HRD | Return supported department codes and labels. |
| `GET` | `/employees/:id` | HRD | Read employee details. |
| `PATCH` | `/employees/:id` | HRD | Edit employee master fields. |
| `DELETE` | `/employees/:id` | HRD | Deactivate employee; does not delete history. |
| `POST` | `/employees/:id/activation-link` | HRD | Reissue an activation link for an eligible account. |
| `POST` | `/attendances` | Employee | Check in with a live work-proof image and selfie. |
| `POST` | `/attendances/me/check-out` | Employee | Multipart check-out with a second live evidence pair and optional activity description (0–2,000 characters). |
| `GET` | `/attendances/me/today` | Employee | Read today's session or `null`. |
| `GET` | `/attendances/me` | Employee | Read own paginated attendance history. |
| `GET` | `/attendances` | HRD | Read/filter/paginate original attendance records. HRD has no update/delete route. |
| `GET` | `/attendances/hr/dashboard` | HRD | Read dashboard counts and three recent direct sessions. |
| `GET` | `/attendances/hr/today-monitoring` | HRD | Read a paginated employee check-in status projection. |
| `GET` | `/attendances/hr/missing-attendance` | HRD | Read paginated active employees with no record for the selected work date. |
| `GET` | `/attendances/:id` | HRD or owner | Read session detail. |
| `GET` | `/attendances/:id/evidence` | HRD or owner | Read default check-in work-proof evidence for compatibility. |
| `GET` | `/attendances/:id/evidence/:kind` | HRD or owner | Read one private evidence item by kind. |
| `POST` | `/attendance-claims` | Employee | Submit a multipart missed-check-in claim with one required photo or PDF evidence file. Requires `Idempotency-Key`. |
| `GET` | `/attendance-claims/me` | Employee | Read own claims. |
| `GET` | `/attendance-claims/pending` | Granted reviewer | Read claims within granted departments. |
| `GET` | `/attendance-claims/:id/evidence` | Claim owner or granted reviewer | Stream the private claim attachment after ownership/reviewer-scope checks. |
| `POST` | `/attendance-claims/:id/approve` | Granted reviewer | Approve a pending claim. |
| `POST` | `/attendance-claims/:id/reject` | Granted reviewer | Reject a pending claim with a reason. |
| `GET` | `/health` | Public | Gateway liveness. |
| `GET` | `/health/ready` | Public | Check both internal services and database readiness. |

### Check-in and check-out multipart contract

Both submission routes use multipart fields `workProof`, `selfie`, and `workProofType` (`SCREEN` or `WORKSPACE`) plus an `Idempotency-Key` header. Each photo is limited to 5 MiB and JPEG, PNG, or WebP with a matching file signature. No employee ID or authoritative attendance timestamp is accepted from the browser. The server creates event timestamps and Jakarta work date.

Check-in requires `CHECKIN_WORK_PROOF` and `CHECKIN_SELFIE`; manual check-out requires `CHECKOUT_WORK_PROOF` and `CHECKOUT_SELFIE`, plus the optional `activityDescription` form field (maximum 2,000 characters, no minimum). Blank activity is stored as null. The automatic eight-hour close has no checkout evidence or activity description. Evidence kinds are `CHECKIN_WORK_PROOF`, `CHECKIN_SELFIE`, `CHECKOUT_WORK_PROOF`, and `CHECKOUT_SELFIE`.

### Missed-check-in claim contract

Claim multipart fields include `workDate`, estimated `claimedCheckInTime` and `claimedCheckOutTime`, a reason, `truthConfirmed`, and one required `evidence` file (JPEG, PNG, WebP, or PDF; maximum 5 MiB). The `Idempotency-Key` is sent in the request header. The default claim window is seven past days and is configurable with `MISSED_CHECKIN_CLAIM_WINDOW_DAYS`. Approval is a separate source of attendance; it does not rewrite original events or backdate the server decision timestamp.

### Query filters

List routes accept `page` (default 1), `limit` (default 20, maximum 100), `search`, `date` (`YYYY-MM-DD`), `department`, `employeeId`, and applicable feature-specific filters such as `employeeStatus` or attendance `source`. `hr/today-monitoring` is fetched by the frontend at five rows per page. Check API DTOs in `libs/contracts/src/dto.ts` for the exact fields accepted by each route.

## Error and correlation contract

The current gateway error envelope is `{ statusCode, code, message, requestId }`. Validation errors may contain an array message. A request ID is generated at the HTTP boundary, returned as `X-Request-Id`, propagated through RPC envelopes and logged with request duration. `RpcClients` uses an 8-second timeout; downstream unavailability is sanitized to HTTP 503. Clients must not automatically retry a non-idempotent submission with a new key.

## Internal TCP RPC patterns

Pattern constants are maintained in `libs/contracts/src/contracts.ts`; handlers live in Employee and Attendance message controllers.

| Pattern | Receiver | Purpose |
|---|---|---|
| `auth.login`, `auth.activate`, `auth.identity`, `auth.logout` | Employee Service | Credentials, account activation, session identity and revocation. |
| `employees.list`, `employees.create`, `employees.detail`, `employees.update`, `employees.deactivate`, `employees.departments`, `employees.activation-link` | Employee Service | Employee administration and lifecycle. |
| `attendance.submit`, `attendance.checkOut`, `attendance.today`, `attendance.mine`, `attendance.list`, `attendance.detail`, `attendance.evidence` | Attendance Service | Attendance lifecycle and reads. |
| `attendance.hrDashboard`, `attendance.hrTodayMonitoring`, `attendance.hrMissingAttendance` | Attendance Service | HR monitoring projections. |
| `missedCheckIn.create`, `missedCheckIn.evidence`, `missedCheckIn.mine`, `missedCheckIn.pending`, `missedCheckIn.approve`, `missedCheckIn.reject` | Attendance Service | Claim lifecycle and department-scoped review. |
| `evidence.sweep`, `health` | Owning service | Orphan cleanup and readiness checks. |

RPC envelopes carry the shared secret, request ID, optional bearer token, and data. Receivers verify the secret and validate untrusted DTO data. User identity and authorization are rechecked downstream. TCP ports are private loopback listeners in the current single-host deployment.

For the source of truth, see `apps/api-gateway/src`, the `@MessagePattern` handlers under `apps/*/src`, and the DTO/pattern definitions under `libs/contracts/src`.
