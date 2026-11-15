# Frontend

DexaWork: React.js + TypeScript, menggunakan Webpack, Babel, dan Tailwind CSS v4.

Visual mengikuti [Figma DexaWork](https://www.figma.com/design/VCJXxjTCgE2XT4iMgibwgD/DexaWork?node-id=0-1): merah Dexa, panel putih, serta layout desktop/mobile. Komponen reusable ada di `src/components/auth`, `dashboard`, `layout`, `attendance`, `employees`, `records`, dan `ui`. `App.tsx` mengelola state dan panggilan API; UI berada di komponen tersebut. Token warna ada di `src/index.css` melalui `@theme`, dan aturan komponen menggunakan `@apply` Tailwind. Ukuran layout utama memakai unit `vw` dengan batas responsif.

Konfigurasi Tailwind v4: `postcss.config.cjs` mendaftarkan `@tailwindcss/postcss`; `webpack.config.cjs` menjalankan `postcss-loader` setelah `css-loader`; `src/index.css` mengimpor Tailwind. Aset Figma yang dipakai disimpan di `src/assets/icons/`. Aset starter yang tidak digunakan telah dihapus.

UI mengikuti alur master PRD: login, dashboard sesuai peran, unggah dan pratinjau foto, konfirmasi waktu server, riwayat dan detail absensi, ringkasan HRD, daftar/tambah/ubah/nonaktifkan karyawan, monitoring, serta profil. Seluruh data dibaca dari backend melalui `src/lib/api.ts`; tidak ada data absensi contoh yang ditampilkan sebagai data nyata. Ringkasan HRD dihitung dari seluruh halaman daftar karyawan aktif dan absensi pada tanggal Asia/Jakarta. Bukti foto diambil melalui endpoint privat.

Rute frontend: `/app`, `/app/attendance/new`, `/app/attendance/history`, `/app/attendance/:id`, `/app/attendance/success`, `/app/profile`; dan `/hr`, `/hr/employees`, `/hr/employees/new`, `/hr/employees/:id/edit`, `/hr/attendance`, `/hr/attendance/:id`, `/hr/profile`. Frontend memetakan rute tersebut ke API backend `/api/v1/auth/*`, `/api/v1/employees/*`, dan `/api/v1/attendances/*`. Sesi bearer disimpan di memori; saat refresh pengguna harus login lagi lalu kembali ke URL yang dibuka.

Backend harus menjalankan ketiga layanan dan MySQL; lihat [runbook backend](../backend/README.md).

Pembuatan akun: HRD membuka Data karyawan → Tambah karyawan, lalu mengisi data karyawan tanpa kata sandi. Setelah tersimpan, dialog menampilkan tautan aktivasi yang dapat disalin dan dibagikan secara pribadi. Karyawan membuka `/activate/:token`, menetapkan kata sandi, lalu login. Akun yang belum aktif tampil sebagai “Menunggu aktivasi”; HRD dapat menerbitkan tautan baru dari daftar. Tautan berlaku 24 jam dan hanya sekali pakai. Pengiriman email otomatis belum tersedia.

Absensi WFH baru meminta izin lokasi browser satu kali saat karyawan memilih “Izinkan dan ambil lokasi”. Koordinat dan perkiraan akurasi disimpan bersama foto; alasan WFH boleh dikosongkan. HRD dapat melihat foto dan lokasi pada dashboard serta detail absensi. Browser meminta izin lokasi dan fitur ini memerlukan HTTPS atau `localhost`; aplikasi tidak memakai pelacakan lokasi berkelanjutan.

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

`REACT_APP_API_URL` menentukan alamat backend. Nilai ini dimasukkan ke bundle saat build; jangan isi dengan rahasia. Restart development server atau rebuild setelah mengubah `.env`.

Default API: `http://localhost:3000/api/v1`. Token bearer disimpan dalam memori; refresh halaman memerlukan login ulang. Akun demo tersedia pada variabel `SEED_*` di `backend/.env`.

## Pengujian browser

```powershell
npm run lint
npm run test:e2e
```

Browser test memerlukan Chrome lokal, backend yang sudah dibuild, dan MySQL dengan seed. Jalankan `npm --prefix backend run db:start:local` dari root workspace bila memakai database lokal proyek. Runner menjalankan layanan sementara pada port 4510/4511/4512 dan Webpack pada 5174, lalu menghentikannya. Data uji memakai nama Browser Demo Employee dan disimpan di database demo. Screenshot desktop/mobile berada di `../.local/screenshots/`.

## Koreksi absensi terlewat

Di Riwayat Absensi, karyawan melihat hari WFH yang telah diverifikasi dan belum tercatat, lalu dapat mengajukan koreksi dengan alasan 20–1000 karakter dan foto pendukung retroaktif. Status, waktu aktual pengajuan/peninjauan, catatan reviewer, dan bukti privat terlihat pada riwayat permintaan. Tanggal tanpa referensi WFH tidak dianggap mangkir. Reviewer yang memperoleh grant eksplisit per departemen melihat kotak tinjau pada Monitor Absensi; HRD biasa tetap hanya dapat membaca catatan absensi. Persetujuan menghasilkan catatan bertanda “Tercatat melalui koreksi” tanpa mengubah waktu absensi asli.
