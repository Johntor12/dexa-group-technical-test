# Database Models and Ownership

**Current snapshot:** 17 November 2026 · Schema source: `prisma/schema.prisma`

| Model | Logical write owner | Purpose and key constraints |
|---|---|---|
| `User` | Employee Service | Login identity, bcrypt hash, role, active state; unique email. |
| `Employee` | Employee Service | Employee profile and generated employee number; one profile per user; unique employee number. |
| `Session` | Employee Service | Revocable login session and expiry; indexed by user. |
| `ActivationToken` | Employee Service | Single pending activation token hash and expiry; one row per user. |
| `EmployeeNumberSequence` | Employee Service | Company-wide monotonic sequence used in the four-digit ID suffix. |
| `AuditEvent` | Employee Service | Actor/employee identifiers, action and JSON change summary. Current schema does not declare FK relations for these identifiers. |
| `Attendance` | Attendance Service | Immutable work-session snapshots, authoritative timestamps, date, checkout state and source; unique `(employeeId, workDate)`. |
| `Evidence` | Attendance Service | Evidence metadata and unique storage key; unique `(attendanceId, kind)`. Image bytes live in private object/file storage. |
| `Idempotency` | Attendance Service | Direct attendance retry fingerprint and key; unique `(employeeId, key)` and one-to-one attendance relation. |
| `MissedCheckInClaim` | Attendance Service | Requested past-date claim, review state, reviewer, actual review time and optional attendance created on approval. |
| `MissedCheckInReviewGrant` | Attendance Service | Explicit reviewer permission scoped to a department; unique `(userId, department, permission)`. |

## Important data rules

- `DepartmentCode` and `Role` are enums; there is no Department lookup table.
- Employee ID is `DEXA-{YYYY}-{DD}-{NNNN}`. `DD` is the two-digit department code and `NNNN` is a single company-wide sequence (not per department). Example format: `DEXA-2026-06-0042`.
- Attendance stores employee name, employee number and department snapshots to preserve historical display when employee master data changes.
- HRD can read original attendance and evidence but cannot edit/delete attendance. Employee deactivation does not cascade-delete the history.
- A claim approval creates an attendance with `MISSED_CHECK_IN_CLAIM` provenance and the actual decision timestamp. It does not replace an original attendance row.
- Evidence access must go through the authorized API. Object storage is private; no public/static evidence URL is exposed.

## Shared database limitation

Both services currently use the same MySQL/TiDB instance, Prisma schema and database credentials. Ownership is a code convention rather than a database-enforced boundary. HR monitoring query methods in Attendance Service currently perform read-only queries against Employee/User data to build employee status projections. This is a known cross-boundary read dependency. Future extraction should preserve the HR view while introducing an explicit service API/read model and least-privilege database roles; it must not be solved by deleting the monitoring flow.

The ER diagram and relation cardinalities are in [ARCHITECTURE_AND_ERD.md](ARCHITECTURE_AND_ERD.md).
