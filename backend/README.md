# PharmaWork Backend

Implementasi NestJS monorepo berdasarkan [PRD](02_PRD.md) dan [Architecture](03_ARCHITECTURE.md). Blueprint README asli tersimpan di [docs/00_ORIGINAL_README.md](docs/00_ORIGINAL_README.md).

## Struktur dan fitur

| Proses/folder | Tanggung jawab | Port |
|---|---|---|
| apps/api-gateway | REST, token issuer, guards, multipart, evidence streaming, Swagger | HTTP 3000 |
| apps/employee-service | Kredensial, sesi, employee, enum departemen, audit | TCP 4001 |
| apps/attendance-service | Absensi, evidence, idempotency, sweeper | TCP 4002 |
| libs/contracts | DTO, principal, envelope, pola RPC | — |
| libs/common | Database, RPC, storage, waktu, errors | — |
| prisma | Schema, migrasi MySQL, seed sintetis | — |

Default bind loopback. Gateway tidak mengakses DB langsung. Attendance memvalidasi token melalui Employee Service; role dari browser tidak dipercaya. Shared MySQL dan private volume mengikuti kompromi MVP blueprint.

- Bearer JWT 1 jam; logout mencabut sesi; akun aktif diperiksa pada HTTP/RPC.
- HRD membuat, mengubah, dan menonaktifkan karyawan. Akun baru belum aktif sampai karyawan memakai tautan aktivasi untuk menetapkan kata sandinya sendiri.
- Tautan aktivasi berlaku 24 jam, hanya sekali pakai, dapat diterbitkan ulang oleh HRD, dan hanya hash token yang disimpan di MySQL. Tautan ditampilkan sekali kepada HRD untuk disalurkan secara pribadi; integrasi email belum tersedia.
- Employee absensi satu kali per tanggal Asia/Jakarta, timestamp server UTC, JPEG/PNG/WebP maksimal 5 MiB. Kiriman baru menyertakan koordinat dan akurasi lokasi dari izin browser serta alasan WFH opsional; catatan lama dapat memiliki lokasi kosong.
- HRD read-only; foto hanya untuk pemilik atau HRD.
- Idempotency persisten, unique(employeeId, workDate), transaksi metadata.
- Validasi HTTP/RPC, request ID, structured logs, timeout 8 detik, Swagger, health.
- Sweeper tiap jam membersihkan file tak dirujuk yang lebih tua dari 24 jam. Timeout tidak langsung menghapus file.

Folder src/ dan test/ lama dipertahankan sebagai referensi scaffold pengguna; tidak masuk build/runtime baru. Pengembangan baru di apps/ dan libs/. Nama proyek Nest CLI: gateway, employee, attendance.

## Menjalankan workspace ini

MySQL 8.0.40 demo terpisah pada 127.0.0.1:3308, data di ../.local/mysql. Service MySQL80 yang sudah ada tidak diubah. .env lokal berisi koneksi, secret acak dan kredensial seed. Instance ini hanya untuk demo lokal.

Dari folder backend:
```powershell
npm run db:start:local
npm run start:dev
```

start:dev menjalankan ketiga proses dengan Nest CLI lokal. Alternatif tiga terminal:
```powershell
npm run start:dev:employee
npm run start:dev:attendance
npm run start:dev:gateway
```

`npm start` menjalankan ketiga service dari hasil build (`dist`). Jalankan `npm run build` terlebih dahulu; jangan gunakan `node dist/apps/api-gateway/src/main.js` sendirian karena login dan fitur API memerlukan Employee Service, sementara absensi memerlukan Attendance Service.

Dari folder frontend pada terminal lain:
```powershell
npm start
```

- UI: http://localhost:5173
- REST: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Liveness: http://localhost:3000/health
- Database/downstream readiness: http://localhost:3000/health/ready

Akun seed demo memakai nama sintetis yang realistis dan email berurutan berdasarkan role/departemen. Admin HRD berasal dari `SEED_HRD_EMAIL` (default `hrd.admin01@pharmawork.test`), reviewer dari `SEED_REVIEWER_EMAIL` (default `hrd.reviewer.it01@pharmawork.test`), dan karyawan dari `SEED_EMPLOYEE_EMAIL` untuk IT (default `employee.it01@pharmawork.test`) serta alamat berurutan seperti `employee.sales01@pharmawork.test` dan `employee.finance01@pharmawork.test` untuk departemen lainnya. Seed mencakup satu karyawan untuk setiap departemen. Semua akun baru memakai `SEED_PASSWORD`; password tidak dicetak di dokumentasi/log. Seed tidak mereset password akun yang sudah ada. Tiga identitas seed lama yang dikenal dipindahkan ke email baru dengan mempertahankan ID dan relasi audit/koreksi, lalu sesi aktifnya dicabut. Seed akan berhenti jika email lama dan penggantinya sama-sama sudah dipakai akun berbeda, agar data tidak digabung atau dihapus diam-diam. Token frontend disimpan di memori; refresh membutuhkan login ulang.

Alur akun baru: HRD login → Data karyawan → Tambah karyawan → isi data tanpa kata sandi → salin tautan aktivasi → karyawan membuka `/activate/:token` dan membuat kata sandi → login. API terkait: `POST /api/v1/employees`, `POST /api/v1/employees/:id/activation-link` (HRD), dan `POST /api/v1/auth/activate` (publik, token sekali pakai). Jalankan `npm run prisma:migrate:deploy` setelah menarik perubahan skema pada database lain.

Departemen adalah enum tertutup: Sales, Marketing, Production, Finance, HR, IT, R&D, Logistic, Administration & Secretary, Design Department. API memakai kode enum seperti `IT` dan `R_AND_D`, sedangkan UI menampilkan labelnya. Migrasi `20261115090000_department_enum` memindahkan karyawan serta snapshot absensi lama, termasuk Engineering → IT dan Human Resources → HR. Untuk database lain, jalankan `npm run prisma:migrate:deploy` lalu `npm run prisma:seed`. Endpoint `GET /api/v1/employees/departments` tetap menyediakan pasangan kode dan label.

## Setup komputer baru

Gunakan Node.js LTS yang memenuhi engine Prisma (22.12+ atau 24+) dan MySQL 8. Versi dikunci di package-lock. Workspace diuji pada Node 26.13.1, Nest 12.5.0, Prisma/client/adapter 7.10.1.

```powershell
npm ci
Copy-Item .env.example .env
# Isi dua secret JWT/RPC berbeda (minimal 32 karakter acak), password DB,
# DATABASE_URL dan SEED_PASSWORD (12–72 byte).
docker compose --env-file .env -f infra/docker-compose.yml up -d mysql
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

Compose hanya menyediakan MySQL. Docker tidak tersedia di mesin verifikasi, sehingga YAML Compose belum dieksekusi di sini. Untuk MySQL sendiri, buat DB dan akun aplikasi lalu ubah DATABASE_URL; URL-encode password. Helper db:start:local khusus instance Windows yang sudah diinisialisasi pada workspace ini.

Perubahan schema development: npm run prisma:migrate:dev -- --name nama_perubahan. Deployment memakai prisma:migrate:deploy, bukan migrate dev. Backup DB dan evidence bersama.

## Konfigurasi production dan deploy backend

Gunakan satu sumber nilai production: `.env.production` untuk menjalankan backend dari VM/lokal, atau environment/secrets platform hosting. File `.env.production` lokal **diabaikan Git** dan tidak perlu di-upload. [.env.production.example](.env.production.example) hanyalah template untuk menyalin nilai yang sama ke hosting; template ini tidak pernah dibaca otomatis. Script production membaca `.env.production` jika file tersedia, dan tetap menerima environment variables dari platform (nilai platform mengungguli file).

CA project berada di `backend/run/secrets/tidb-ca.pem`. Path production relatif ke working directory `backend`: `TIDB_CA_PATH=run/secrets/tidb-ca.pem`. Jika hosting tidak membawa file tersebut, mount CA pada server dan set `TIDB_CA_PATH` ke path mount yang sebenarnya. URL Prisma menggunakan TLS strict; `prisma.config.ts` menyamakan `sslcert` dengan `TIDB_CA_PATH`. Database aplikasi `pharmawork` dan delapan migrasi awal sudah disiapkan. Jangan gunakan database sistem `sys`.

Untuk hosting dengan Root Directory `backend`, gunakan:

- Build command: `npm ci --include=dev && npm run build` (Prisma CLI and TypeScript are build-time dependencies).
- Start command: `npm start`
- Set variabel dari `.env.production.example` pada environment/secrets platform. Isi password TiDB yang aktif, dua secret acak berbeda (minimal 32 karakter), path CA, dan `CORS_ORIGIN=https://dexa-group-technical-test-frontend.vercel.app`.
- Jalankan `npm run prisma:migrate:deploy:prod` sebagai release/deploy command. Perintah ini idempotent dan memakai sumber env production yang sama. Jangan jalankan `prisma:seed` pada production.

`npm start` menjalankan Employee Service, Attendance Service, dan API Gateway bersama dalam satu instance. Gateway menggunakan `PORT` dari hosting dan bind ke `0.0.0.0`; TCP services hanya bind di loopback instance tersebut. Setelah deploy, cek `https://<backend-domain>/health/ready` hingga status 200. Di Vercel, set `REACT_APP_API_URL=https://<backend-domain>/api/v1`, lalu redeploy frontend. `EVIDENCE_STORAGE_DIR` harus memakai persistent disk/volume supaya foto tidak hilang saat instance diganti.

## Verifikasi

```powershell
npm run build
npm test
npm run test:e2e
npm run lint
npm audit
```

Unit tanpa DB. E2E membutuhkan DB dan seed; runner membuat tiga proses pada 4310/4311/4312 lalu menghentikannya. Test menambah akun/absensi sintetis Automated Test; gunakan database demo khusus.

Browser test dari frontend: npm run test:e2e. Membutuhkan Chrome lokal, backend sudah dibuild, DB dan seed. Runner memakai 4510/4511/4512 serta frontend 5174. Screenshot di ../.local/screenshots/. Foto test sintetis bukan bukti nyata.

Hasil 14 November 2026:
- Build backend dan React/Webpack berhasil.
- 4 unit test: midnight Jakarta, signature foto, pagination, role injection.
- 48 pemeriksaan integrasi: login, CRUD, audit, duplicate race/replay, invalid upload, ownership, deaktivasi/revocation, RPC failure, Swagger, cleanup evidence.
- Chrome: HRD create/search, Employee login/upload/private photo; mobile tanpa overflow halaman.
- Axe WCAG A/AA pada halaman HRD dan Employee mobile tanpa pelanggaran terdeteksi. Bukan sertifikasi atau pengganti audit manual seluruh alur.
- Audit dependency terpasang backend/frontend: 0 kerentanan.
- start:dev menjalankan tiga proses; health/ready mengembalikan ok.

## Kontrak dan batas implementasi

Lihat [API_AND_IMPLEMENTATION.md](docs/API_AND_IMPLEMENTATION.md). BRD, API/Data, Handoff dan PDF rujukan tidak tersedia; rincian payload dan bearer session adalah keputusan implementasi.

- Demo lokal; belum deployment produksi, load test, distributed tracing, object storage, backup automation.
- Rate limiter login in-memory per gateway; perlu shared limiter saat scale-out.
- Retry memakai foto/key sama. UI mempertahankan key dalam halaman yang sama; setelah reload periksa status hari ini.
- Foto divalidasi ukuran/MIME/magic bytes; analisis keaslian dan re-encoding di luar MVP.
- Audit tersedia di DB; tidak ada endpoint audit tersendiri.

Referensi: [Nest TCP](https://docs.nestjs.com/microservices/basics), [Prisma MySQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql).

## Koreksi absensi terlewat (addendum PW-PRD-ADD-001)

Jalankan `npm run prisma:migrate:deploy` dan `npm run prisma:seed` setelah memperbarui kode. Migrasi `20261115110000_attendance_corrections` hanya menambah tabel/kolom; absensi lama menjadi `source=DIRECT`. Absensi yang disetujui menjadi `source=CORRECTION`, memakai `workDate` yang diminta dan `submittedAt` saat persetujuan aktual. Foto pendukung koreksi tersimpan terpisah dari foto absensi langsung dan hanya dapat dibuka pemilik atau reviewer sesuai cakupan.

`CORRECTION_WINDOW_DAYS` menentukan jendela pengajuan (default 7 hari kalender). Hari hanya bisa diajukan jika ada baris `CorrectionEligibleDay` untuk karyawan dan tanggal itu. Tanpa referensi tersebut UI menampilkan “Perlu verifikasi jadwal”, bukan menandai mangkir. Referensi WFH ini harus disetujui sesuai kebijakan HR; seed hanya memberi satu tanggal sintetis dua hari lalu pada akun employee demo. Contoh penambahan tanggal yang sudah diverifikasi:

```sql
INSERT INTO CorrectionEligibleDay (id, employeeId, workDate, note)
VALUES (UUID(), '<employee-uuid>', '2026-11-12', 'WFH disetujui');
```

Seed membuat `SEED_REVIEWER_EMAIL` (default `hrd.reviewer.it01@pharmawork.test`) dengan kata sandi `SEED_PASSWORD` dan grant `ATTENDANCE_CORRECTION_REVIEW` **hanya untuk departemen IT**. HRD biasa tidak memperoleh grant. Reviewer lain perlu grant eksplisit per departemen pada tabel `CorrectionReviewGrant`; pengguna nonaktif ditolak oleh autentikasi dan pemilik permintaan tidak dapat menyetujui sendiri. Pengajuan ulang setelah ditolak diperbolehkan selama jendela masih berlaku, dengan tautan `priorRejectedRequestId` dan riwayat permintaan lama tetap tersimpan.

API baru ada di `/api/v1/attendance-corrections`: `GET eligible-days`, `POST /` multipart (`workDate`, `reason`, `evidence`, header `Idempotency-Key`), `GET me`, `GET pending?status=PENDING|APPROVED|REJECTED`, `GET :id`, `GET :id/evidence/:evidenceId`, `POST :id/cancel`, `POST :id/approve`, dan `POST :id/reject`. Keputusan serta pembatalan ditulis bersama audit dalam transaksi. Semua bukti tetap pada volume privat yang sama. Tidak ada endpoint untuk HRD mengubah absensi asli.

## Task pada absensi langsung

Form employee meminta deskripsi task yang dikerjakan dan alasan WFH tetap opsional. `taskDescription` ditambahkan sebagai kolom nullable lewat migrasi non-destruktif `20261116120000_attendance_task`; baris absensi lama dan absensi koreksi tetap valid tanpa nilai task. Kontrak UI baru mewajibkan task untuk check-in langsung. Monitoring mengurutkan berdasarkan `submittedAt` terbaru terlebih dahulu.

## Check-in, check-out, dan klaim lupa check-in

Migrasi aditif `20261116130000_checkin_checkout_claims` menambahkan metadata waktu pengambilan foto, batas check-out, waktu check-out, dan tabel klaim. Terapkan migrasi berurutan dengan `npm run prisma:migrate:deploy`; foto/absensi lama tetap tersimpan. Endpoint `POST /api/v1/attendances/photo-metadata` membaca EXIF `DateTimeOriginal` dan offset opsional dari foto sebelum pengiriman. Check-in akhir memvalidasi ulang foto, menyimpan waktu resmi dari server di `submittedAt`, dan menjadwalkan check-out otomatis tepat 8 jam kemudian. Waktu EXIF adalah metadata foto yang terpisah, bukan sumber hitungan durasi.

Karyawan mengirim check-out manual melalui `POST /api/v1/attendances/me/check-out`; tidak ada foto kedua. Sweeper layanan attendance menutup sesi yang jatuh tempo dengan `checkOutAt` sama dengan batas 8 jam dan menyimpan waktu pencatatan otomatis terpisah. Akses `GET /attendances/me/today` juga memproses sesi jatuh tempo sebagai fallback.

Jika check-in terlupa, employee dapat mengirim `POST /api/v1/attendance-corrections/missed-checkin` dengan tanggal lampau, perkiraan waktu mulai/selesai, task, alasan, konfirmasi kebenaran, dan `Idempotency-Key`. Pengajuan tidak langsung menjadi kehadiran. Reviewer harus memiliki grant departemen eksplisit; keputusan tersedia pada `POST /missed-checkin/:id/approve|reject`. Saat disetujui, `submittedAt` mencatat waktu persetujuan aktual dari server; waktu klaim tetap tersimpan terpisah. HRD tanpa grant tetap hanya dapat membaca catatan asli. Daftar employee dan antrean reviewer tersedia pada `/missed-checkin/me` dan `/missed-checkin/pending`.
