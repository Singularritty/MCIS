# Mini Clinic Information System (MCIS)

Aplikasi web mini clinic information system yang dibangun sesuai dengan take-home test programmer. Aplikasi ini mencakup autentikasi JWT, pengelolaan data pasien, pendaftaran kunjungan, antrean, rekam medis SOAP, serta dashboard operasional klinik.

## Teknologi yang digunakan

- Frontend: React + React Router + Vite
- Backend: Node.js + Express + TypeScript
- Runtime: Bun
- Database: PostgreSQL / MySQL concept (schema SQL disediakan untuk migrasi manual)
- Authentication: JWT

## Struktur Project

```text
.
├─ README.md
├─ .env.example
├─ database/
│  └─ clinic_schema.sql
├─ docs/
│  └─ ERD.md
├─ postman/
│  └─ MCIS-Clinic.postman_collection.json
├─ package.json
├─ mcis/
│  ├─ backend/
│  │  ├─ index.ts
│  │  ├─ index.test.ts
│  │  └─ package.json
│  └─ frontend/
│     ├─ app/
│     ├─ public/
│     ├─ package.json
│     └─ vite.config.ts
└─ .gitignore
```

## Persyaratan

- Bun v1.x
- Node.js 20+
- PostgreSQL/MySQL (opsional jika ingin dihubungkan ke database nyata)

## Instalasi

```bash
cd d:/tets
bun install
```

## Konfigurasi Environment

Buat file `.env` di root project berdasarkan `.env.example`.

```env
PORT=3001
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mcis_db
DB_USER=postgres
DB_PASSWORD=your_password
```

## Menjalankan Aplikasi

```bash
cd d:/tets
bun run dev
```

Perintah di atas akan menjalankan backend dan frontend secara paralel.

## Akun Login Demo

- Username: `admin` | Password: `admin123`
- Username: `dokter` | Password: `dokter123`
- Username: `registrar` | Password: `registrar123`

## Fitur Utama

- Login dan logout dengan JWT
- Role-based authorization
- Data pasien dengan validasi NIK unik
- Pendaftaran kunjungan
- Antrean pasien otomatis
- Rekam medis SOAP
- Input tindakan medis dan resep obat
- Dashboard ringkas

## Catatan Implementasi

Karena target take-home ini fokus pada arsitektur aplikasi, integrasi frontend-backend, serta fitur utama, implementasi saat ini menggunakan data in-memory di backend untuk mensimulasikan penyimpanan sementara. Skema SQL dan ERD disertakan agar siap dikembangkan ke database riil pada tahap berikutnya.

## Referensi

- PDF tugas: `TECHNICAL ASSIGNMENT PROGRAMMER NEXA.pdf`
- ERD: `docs/ERD.md`
- Database schema: `database/clinic_schema.sql`
- Postman collection: `postman/MCIS-Clinic.postman_collection.json`
