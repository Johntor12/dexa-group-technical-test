# Frontend

DexaWork: React.js + TypeScript, menggunakan Webpack, Babel, dan Tailwind CSS v4.

Visual mengikuti [Figma DexaWork](https://www.figma.com/design/VCJXxjTCgE2XT4iMgibwgD/DexaWork?node-id=0-1): merah Dexa, panel putih, serta layout desktop/mobile. Komponen reusable ada di `src/components/auth`, `dashboard`, `layout`, `attendance`, `employees`, `records`, dan `ui`. `App.tsx` mengelola state dan panggilan API; UI berada di komponen tersebut. Token warna ada di `src/index.css` melalui `@theme`, dan aturan komponen menggunakan `@apply` Tailwind. Ukuran layout utama memakai unit `vw` dengan batas responsif.

Konfigurasi Tailwind v4: `postcss.config.cjs` mendaftarkan `@tailwindcss/postcss`; `webpack.config.cjs` menjalankan `postcss-loader` setelah `css-loader`; `src/index.css` mengimpor Tailwind. Aset Figma yang dipakai disimpan di `src/assets/icons/`. Aset starter yang tidak digunakan telah dihapus.

UI mengikuti alur master PRD: login, dashboard sesuai peran, check-in dengan foto dan lokasi, sesi kerja, check-out manual/otomatis, klaim lupa check-in, riwayat dan detail, ringkasan HRD, manajemen karyawan, monitoring, serta profil. Seluruh data dibaca dari backend melalui `src/lib/api.ts`; tidak ada data absensi contoh yang ditampilkan sebagai data nyata. Ringkasan HRD dihitung dari seluruh halaman daftar karyawan aktif dan catatan pada tanggal Asia/Jakarta. Bukti foto diambil melalui endpoint privat.

Rute employee: `/app`, `/app/check-in`, `/app/check-in/success`, `/app/check-in/missed`, `/app/check-out`, `/app/check-out/success`, `/app/check-out/automatic`, `/app/attendance/history`, `/app/attendance/:id`, dan `/app/profile`. Rute HRD tetap `/hr`, `/hr/employees`, dan `/hr/attendance` beserta detail/profil. Frontend memetakan rute ke API `/api/v1/auth/*`, `/api/v1/employees/*`, `/api/v1/attendances/*`, dan `/api/v1/attendance-claims/*`. Sesi bearer disimpan di memori; refresh memerlukan login ulang.

Backend harus menjalankan ketiga layanan dan MySQL; lihat [runbook backend](../backend/README.md).

Pembuatan akun: HRD membuka Data karyawan → Tambah karyawan, lalu mengisi data karyawan tanpa kata sandi. Setelah tersimpan, dialog menampilkan tautan aktivasi yang dapat disalin dan dibagikan secara pribadi. Karyawan membuka `/activate/:token`, menetapkan kata sandi, lalu login. Akun yang belum aktif tampil sebagai “Menunggu aktivasi”; HRD dapat menerbitkan tautan baru dari daftar. Tautan berlaku 24 jam dan hanya sekali pakai. Pengiriman email otomatis belum tersedia.

Absensi WFH baru meminta izin lokasi browser satu kali saat karyawan memilih “Izinkan dan ambil lokasi”. Koordinat dan perkiraan akurasi disimpan bersama foto; alasan WFH boleh dikosongkan. HRD dapat melihat foto dan lokasi pada dashboard serta detail absensi. Browser meminta izin lokasi dan fitur ini memerlukan HTTPS atau `localhost`; aplikasi tidak memakai pelacakan lokasi berkelanjutan.

Check-in mengharuskan foto, lokasi, deskripsi task, serta tanggal dan waktu foto. Frontend mencoba membaca metadata kamera (`DateTimeOriginal`, `CreateDate`, dan tag terkait) melalui backend. Jika metadata tidak ada atau tidak valid, employee memilih tanggal dan jam berdasarkan cap air yang terlihat pada foto. Cap air yang hanya berupa tulisan di piksel tidak dapat dipastikan otomatis tanpa OCR, sehingga input manual menjadi fallback. Backend memvalidasi tanggal/jam yang dikirim dan menyimpannya terpisah; timestamp check-in resmi selalu dibuat server dan tidak memakai waktu foto. Check-out manual tidak meminta foto tambahan. Jika employee tidak check-out, backend mengisi waktu check-out tepat 8 jam setelah check-in server; nilai waktu pencatatan otomatis disimpan terpisah.

## Development

Salin `.env.example` menjadi `.env` jika belum tersedia.

```powershell
npm install
npm start
```

Buka http://localhost:5173. `npm run dev` tersedia sebagai alias.

## Build

```powershell
npm run typecheck
npm run build
```

Output produksi berada di `dist/`. Build menjalankan pemeriksaan TypeScript sebelum bundling. Deploy isi folder tersebut melalui static web server dengan fallback ke `index.html` jika menggunakan client-side routing.

`API_URL` menentukan alamat backend. Nilai ini dimasukkan ke bundle saat build; jangan isi dengan rahasia. Restart development server atau rebuild setelah mengubah `.env`.

Default API: `http://localhost:3000/api/v1`. Token bearer disimpan dalam memori; refresh halaman memerlukan login ulang. Akun demo tersedia pada variabel `SEED_*` di `backend/.env`.

## Deploy ke Vercel

Pilih Root Directory `frontend`. Tambahkan environment variable Production `API_URL` dengan nilai `https://<backend-domain>/api/v1`, kemudian redeploy frontend. Backend harus mengizinkan origin persis `https://dexa-group-technical-test-frontend.vercel.app` melalui `CORS_ORIGIN`.

## Pengujian browser

```powershell
npm run lint
npm run test:e2e
```

Browser test memerlukan Chrome lokal, backend yang sudah dibuild, dan MySQL dengan seed. Jalankan `npm --prefix backend run db:start:local` dari root workspace bila memakai database lokal proyek. Runner menjalankan layanan sementara pada port 4510/4511/4512 dan Webpack pada 5174, lalu menghentikannya. Data uji memakai nama Browser Demo Employee dan disimpan di database demo. Screenshot desktop/mobile berada di `../.local/screenshots/`.

## Klaim check-in yang terlupa

Dari alur check-in yang terlewat, karyawan mengajukan klaim dengan tanggal kerja lampau, perkiraan jam mulai/selesai, alasan minimal 20 karakter, dan konfirmasi kebenaran. Tidak ada form koreksi umum atau unggahan bukti koreksi. Klaim belum menjadi kehadiran sampai disetujui reviewer yang memiliki izin eksplisit untuk departemen karyawan. Waktu keputusan dan timestamp kehadiran dibuat oleh server; riwayat absensi asli tidak diubah.
