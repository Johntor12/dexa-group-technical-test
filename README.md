# PharmaWork — Dexa Group Technical Test

React.js + TypeScript + Webpack + Tailwind, NestJS tiga proses, Prisma, dan MySQL 8.

Terminal backend:
```powershell
cd backend
npm run db:start:local
npm run start:dev
```

Terminal frontend:
```powershell
cd frontend
npm start
```

UI: http://localhost:5173. Swagger: http://localhost:3000/api/docs.

Akun demo: SEED_HRD_EMAIL, SEED_EMPLOYEE_EMAIL, SEED_PASSWORD di backend/.env. Jangan commit .env.

[Runbook backend](backend/README.md) menjelaskan setup, migrasi, seed, arsitektur, test dan batas verifikasi. [PRD](backend/02_PRD.md) dan [Arsitektur](backend/03_ARCHITECTURE.md) menjadi acuan.

- HRD: CRUD/deaktivasi karyawan, monitoring absensi dan foto privat.
- Employee: absensi WFH dengan foto, riwayat dan foto milik sendiri.

MySQL demo terpisah di port 3308. Sesuai PRD terbaru, aplikasi lengkap membutuhkan DB; starter tanpa koneksi database sebelumnya digantikan arsitektur tiga layanan.
