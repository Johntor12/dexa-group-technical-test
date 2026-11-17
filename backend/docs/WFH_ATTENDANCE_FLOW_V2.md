# WFH attendance flow v2

> **Status: Historical feature handoff.** The user flow remains useful, but some rollout/storage notes have changed. See [the current product scope](CURRENT_PRODUCT_SPEC.md), [current API contracts](API_RPC_CONTRACTS.md), and [backend README](../README.md) for current implementation and deployment facts.

## Scope and source distinction

The source requirements in Ketentuan_Aplikasi_WFH.pdf ask for employee WFH attendance with a capture date/time and photo evidence, plus HRD employee administration and read-only attendance monitoring. They do not ask for task descriptions, location tracking, selfies, paired check-in/check-out captures, or automatic checkout. The paired live capture flow below is a product change explicitly requested after that document was reviewed; it is not a requirement from the PDF.

This change is limited to the attendance workflow and its contracts/schema. Existing authentication, employee CRUD, HRD monitoring, missed check-in claim review, and original attendance history remain. HRD continues to read attendance records and evidence without editing the original row.

## New employee flow

1. Employee signs in and selects Check-in.
2. Browser requests camera access for a live workspace photo, or display-capture access for a selected laptop screen. The employee also takes a front-camera selfie. Both images are required.
3. The browser overlays a WIB timestamp from the device clock as a visual cue. This overlay is client-controlled and is not used as the official record time.
4. The gateway validates file type/size, stages the two private images, and sends evidence metadata through the existing attendance service. The service assigns the authoritative check-in event time from server time.
5. At Check-out, the employee repeats both live captures. The server records a separate check-out event and timestamp.
6. If there is no manual check-out, the existing eight-hour automatic closure remains. Automatic closure does not create checkout evidence.
7. HRD opens attendance detail and can compare check-in and checkout work proof and selfies. HRD has read-only access to the attendance record.

Capture means a browser-mediated camera frame or a screen source selected by the user. It is visual evidence for human review only: it does not establish geographic location, prove identity, or automatically determine that an employee moved. Screen captures may expose private or company information, so the UI reminds the employee to close unrelated content. Camera and screen permission can be denied; in that case the employee cannot submit the required live evidence.

## API and contract changes

- POST /api/v1/attendances: multipart fields workProof, selfie, workProofType and Idempotency-Key.
- POST /api/v1/attendances/me/check-out: same multipart contract and a separate idempotency key.
- GET /api/v1/attendances/:id/evidence/:kind: private evidence stream for CHECKIN_WORK_PROOF, CHECKIN_SELFIE, CHECKOUT_WORK_PROOF, or CHECKOUT_SELFIE. The existing evidence URL without kind continues to resolve to check-in work proof for compatibility.
- /attendances/photo-metadata is no longer used by the frontend. EXIF/device metadata is not an authoritative server timestamp.
- New check-in/check-out requests do not accept task, WFH reason, location, or client-supplied attendance timestamps. Attendance timestamps come from server time.

## Database and migrations

- 20261117100000_live_checkin_checkout_evidence changes evidence to multiple rows per attendance/event kind, adds four evidence kinds, work-proof type, evidence recorded time, and check-out idempotency fields. Existing evidence is retained and backfilled as check-in work proof using original server submission time.
- 20261117110000_optional_missed_claim_task makes the missed-check-in claim task field nullable. The missed check-in claim form does not collect a task description; existing task text remains in historical rows.
- Historical attendance columns for location, task, and WFH reason are deliberately retained to preserve data. New attendance endpoints do not write these fields, and redesigned attendance views do not collect or display them. Removing old columns would require a separate retention decision and destructive migration.
- Original check-in/out timestamps are server-created. Device clock overlays are never used to backdate attendance.

## Frontend flow and reusable components

- AttendanceCaptureForm owns work-proof choice, camera/display permission, live capture, selfie capture, device-time overlay, and image preview. It is reused for check-in and check-out.
- TodayAttendanceCard hosts the check-in flow. CheckoutConfirmation hosts the second capture pair. CheckInReceipt and SessionCompletion show the evidence receipt.
- AttendanceDetail displays event evidence and server times for employee and HRD detail routes.
- Missed check-in claims are the only retrospective workflow. They collect an estimated work date and times, reason, and truth confirmation, then require an explicitly authorized reviewer.

## Development validation

Development commands are guarded by scripts/load-development-env.mjs, which forces .env.development and rejects any non-loopback database URL. The production .env is not used for the local migration or checks. Development migration history should include both migration IDs above.

Development uses the configured private local storage adapter. Production storage integration is implemented through the Supabase adapter in `libs/common/src/storage.ts`; production requires a private bucket, server-side credentials, correct MIME/size settings, and connectivity from both backend processes. Validate upload, private read, deletion/orphan cleanup, and CORS/size limits after configuring a deployment. Do not run production migration commands during development validation.
