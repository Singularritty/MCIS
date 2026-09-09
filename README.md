# Mini Clinic Information System (MCIS)

Aplikasi web *Mini Clinic Information System* untuk klinik pratama, dibangun sesuai take-home test Programmer. Mencakup autentikasi berbasis JWT dengan otorisasi per-role, pengelolaan data pasien, pendaftaran kunjungan, antrean, pemeriksaan dokter (metode SOAP), resep obat, dan dashboard operasional klinik.

## Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Frontend | React 19 + React Router 8 (SPA mode) + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express 5 + TypeScript |
| Runtime | Bun |
| Database | PostgreSQL |
| Authentication | JSON Web Token (JWT), password di-hash dengan `Bun.password` (argon2id) |
| Icon | lucide-react |
| Version Control | Git |

## Struktur Project

```text
.
├─ README.md
├─ .env.example                  # Konfigurasi environment (root, dipakai backend)
├─ database/
│  ├─ clinic_schema.sql          # DDL lengkap (tabel + foreign key + sequence)
│  └─ seed.sql                   # Data awal (akun demo, dokter, poli, pasien contoh)
├─ docs/
│  └─ ERD.md                     # Entity Relationship Diagram (mermaid)
├─ postman/
│  └─ MCIS-Clinic.postman_collection.json
├─ package.json                  # Workspace root (bun --parallel dev:backend dev:frontend)
├─ biome.json                    # Konfigurasi lint & format (dipakai seluruh workspace)
├─ mcis/
│  ├─ backend/
│  │  ├─ index.ts                # Express app: semua route REST API
│  │  ├─ db.ts                   # Koneksi Postgres + auto-create schema & seed saat start
│  │  ├─ index.test.ts           # Test (bun test)
│  │  └─ package.json
│  └─ frontend/
│     ├─ app/
│     │  ├─ routes/              # Satu file per halaman (login, dashboard, patients, dst)
│     │  ├─ components/          # Komponen reusable (Select, Modal, Avatar, ConfirmDialog, dst)
│     │  ├─ lib/                 # api.ts (client REST), auth.tsx (AuthContext), toast.tsx
│     │  ├─ routes.ts             # Definisi routing React Router
│     │  ├─ root.tsx              # Provider (Auth, Toast) + layout HTML
│     │  └─ app.css               # Design system (token warna, komponen, sidebar, dll)
│     ├─ public/
│     └─ vite.config.ts
└─ .gitignore
```

## Persyaratan

- [Bun](https://bun.sh) v1.4+
- PostgreSQL 14+ (lokal atau remote)

## Instalasi

```bash
git clone <repository-url>
cd mcis-clinic
bun install
```

`bun install` di root otomatis meng-install dependency untuk backend maupun frontend (dikelola sebagai Bun workspaces — lihat `workspaces` di `package.json` root).

## Konfigurasi Environment

Salin `.env.example` menjadi `.env` di **root project** (dipakai oleh backend):

```bash
cp .env.example .env
```

```env
PORT=3001
JWT_SECRET=your_jwt_secret_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mcis_db
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

Alternatif: isi `DATABASE_URL` (connection string Postgres lengkap) — jika ada, `DATABASE_URL` diprioritaskan dan variabel `DB_*` di atas diabaikan.

> **Keamanan**: `.env` sudah masuk `.gitignore` dan tidak boleh di-commit. Jangan hardcode `JWT_SECRET`, kredensial database, atau rahasia lain langsung di source code — semuanya wajib dibaca dari environment variable.

Buat database kosong terlebih dahulu di PostgreSQL:

```sql
CREATE DATABASE mcis_db;
```

## Cara Migrasi / Membuat Schema Database

Proyek ini **tidak menggunakan tool migration** (mis. Prisma/Knex/Drizzle) — ada dua cara setara untuk menyiapkan schema, silakan pilih salah satu:

**Opsi 1 — Otomatis (direkomendasikan untuk development)**

Backend akan membuat semua tabel (`CREATE TABLE IF NOT EXISTS`, termasuk foreign key & sequence) dan mengisi data awal (akun demo, dokter, poli, pasien contoh) secara otomatis saat pertama kali start — lihat `ensureDatabase()` di `mcis/backend/db.ts`. Cukup pastikan database kosong (`mcis_db`) sudah ada dan `.env` terisi benar, lalu langsung jalankan aplikasi (lihat bagian **Menjalankan Aplikasi**).

**Opsi 2 — Manual via `psql`**

Berguna untuk setup database di luar alur aplikasi (mis. server terpisah):

```bash
psql -U postgres -d mcis_db -f database/clinic_schema.sql
psql -U postgres -d mcis_db -f database/seed.sql
```

Idempotent — aman dijalankan ulang (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

## Menjalankan Aplikasi

```bash
bun run dev
```

Menjalankan backend (`http://localhost:3001`) dan frontend (`http://localhost:5173`) secara paralel. Buka `http://localhost:5173` di browser — frontend sudah dikonfigurasi proxy `/api` ke backend (lihat `vite.config.ts`).

Perintah lain yang tersedia:

```bash
bun run lint          # biome check --write (format + lint seluruh workspace)
cd mcis/backend && bun test              # test backend
cd mcis/frontend && bun run typecheck    # type-check frontend
cd mcis/frontend && bun run build        # build produksi frontend
```

## Akun Login Demo

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Dokter | `dokter` | `dokter123` |
| Petugas Pendaftaran | `registrar` | `registrar123` |

## Fitur Utama

- **Autentikasi & Otorisasi** — login/logout JWT, akses tiap endpoint & tombol aksi dibatasi per role (ditegakkan di backend via middleware, bukan cuma disembunyikan di frontend).
- **Data Pasien** — tambah/ubah/hapus/detail, pencarian, pagination, No. Rekam Medis auto-generate (Postgres sequence), validasi NIK unik.
- **Pendaftaran Pasien** — pilih pasien/dokter/poli, jenis pembayaran, keluhan awal; setiap pendaftaran otomatis membuat entri antrean.
- **Antrean** — nomor antrean auto-generate (format `A001`, `A002`, ...), panggil antrean berikutnya, ubah status kunjungan (`Menunggu → Check In → Pemeriksaan → Selesai`).
- **Pemeriksaan Dokter (SOAP)** — keluhan pasien, tanda vital, diagnosa, rencana terapi, tindakan medis, resep obat, dan riwayat pemeriksaan per pasien.
- **Dashboard** — total pasien, pasien hari ini, antrean hari ini, pasien menunggu, pasien selesai dilayani.
- Notifikasi toast, konfirmasi modal untuk aksi hapus, skeleton loading, dan navigasi sidebar dengan ikon.

## Asumsi & Penyederhanaan

- `medical_records.doctor_id` merujuk ke akun `users` yang sedang login sebagai Dokter (siapa yang menulis catatan), **bukan** ke katalog `doctors` yang dipakai saat pendaftaran/penjadwalan — dua konsep berbeda karena aplikasi ini tidak memetakan satu akun login ke satu baris dokter tertentu di katalog.
- Data referensi (Dokter, Poliklinik) dikelola lewat seed data, tidak ada modul CRUD khusus untuk itu — sesuai cakupan REST API minimum di dokumen assignment yang hanya mensyaratkan CRUD pada Pasien.
- Logout bersifat *client-side token discard* (menghapus token JWT di sisi browser); tidak ada token blacklist di server, sesuai skema JWT stateless sederhana.
- Endpoint memakai prefix `/api/...` (konvensi umum aplikasi Express), sedikit berbeda literal dari penulisan di dokumen assignment (`/login`, `/patients`, dst) namun method & path resource-nya sama persis.

## Referensi

- ERD: `docs/ERD.md`
- Database schema: `database/clinic_schema.sql`
- Seed data: `database/seed.sql`
- Postman collection: `postman/MCIS-Clinic.postman_collection.json`
