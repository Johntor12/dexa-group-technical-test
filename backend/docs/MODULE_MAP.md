# Backend Module Map

This map reflects the actual NestJS runtime composition. Nest modules are DI composition units; only the three `apps/*` entry points are runtime processes.

| Application | Nest module / feature folder | Controllers/providers | Responsibility and dependencies |
|---|---|---|---|
| API Gateway | `AppModule` | Imports `InfrastructureModule`, `AuthModule`, `EmployeesModule`, `AttendanceModule`, `AttendanceClaimsModule`; registers `HealthController`. | HTTP composition. |
| API Gateway | `common/InfrastructureModule` | Global providers: `RpcClients`, `PhotoStorage`, `AuthGuard`. | Shared request infrastructure, TCP clients, evidence adapter. |
| API Gateway | `auth/AuthModule` | `AuthController`, `AuthService`. | Login, activation, forgot/reset/change password, logout and current identity routes. |
| API Gateway | `employees/EmployeesModule` | `EmployeesController`. | Thin HTTP-to-Employee-Service route adapter. |
| API Gateway | `attendance/AttendanceModule` | `AttendanceController`. | HTTP attendance route, multipart staging and authorized evidence streaming. |
| API Gateway | `attendance-claims/AttendanceClaimsModule` | `AttendanceClaimsController`. | HTTP claim route adapter. |
| Employee Service | `AppModule` → `employees/EmployeesModule` | `EmployeesMessageController`, `EmployeesService`, `CredentialsService`, `EmployeesRepository`, `Database`. | Internal account, employee and session operations. Credentials currently live in a separate folder but are registered by this application module. |
| Attendance Service | `AppModule` → `attendance/AttendanceModule` | `AttendanceMessageController`, `MissedCheckInClaimsMessageController`, `AttendanceService`, `MissedCheckInClaimsService`, `AttendanceRepository`, `Database`, `RpcClients`, `PhotoStorage`, `AutoCheckoutSweeper`, `OrphanSweeper`. | Internal attendance, claim, evidence and scheduled-work operations. Feature folders separate attendance, claims and evidence code; providers are composed in this application module. |
| Shared libraries | `libs/contracts` | DTOs, enum contracts, `Principal`, RPC `Envelope`, pattern constants. | Shared HTTP/RPC contracts and validation metadata. |
| Shared libraries | `libs/common` | Database factory, RPC client, storage adapter, errors, config, time and validation helpers. | Cross-application infrastructure used by runtime services. |

## Structure audit note

The active implementation lives in `backend/apps`, `backend/libs`, and `backend/prisma`. `backend/src` is the original Nest CLI scaffold and is excluded from `tsconfig.build.json`; it is not a running application. It remains in the repository as legacy reference code and should not receive new features. Removing it should be a separate reviewed cleanup because its old specs and scripts may still be referenced by contributors.

Current repositories expose a Prisma client through a `db` getter rather than encapsulating domain queries. This is a thin convenience wrapper, not a strict persistence port. The clean-code audit records that boundary as a future improvement; no generic repository framework was added.
