# ERD Mini Clinic Information System

Sesuai implementasi di `database/clinic_schema.sql`. Seluruh primary key & foreign key bertipe `TEXT` (bukan integer auto-increment) — nilai ID dibuat di sisi aplikasi (mis. `p-1001`, `reg-...`).

```mermaid
erDiagram
    patients ||--o{ registrations : has
    doctors ||--o{ registrations : "assigned to"
    clinic_polyclinics ||--o{ registrations : serves
    registrations ||--o{ queues : "generates"
    patients ||--o{ medical_records : has
    users ||--o{ medical_records : writes
    patients ||--o{ prescriptions : has
    medical_records ||--o{ prescriptions : contains

    patients {
        text id PK
        text medical_record_number UK "auto-generate via sequence"
        text nik UK
        text name
        text gender
        text birth_date
        text phone
        text address
        timestamp created_at
    }

    doctors {
        text id PK
        text name
        text specialty
    }

    clinic_polyclinics {
        text id PK
        text name
    }

    registrations {
        text id PK
        text patient_id FK
        text doctor_id FK
        text poly_id FK
        text visit_date
        text payment_type
        text complaint
        text status "Menunggu | Check In | Pemeriksaan | Selesai"
        timestamp created_at
    }

    queues {
        text id PK
        text registration_id FK
        text queue_number "format A001, A002, ..."
        text status "Menunggu | Check In | Pemeriksaan | Selesai"
        text patient_name "denormalized untuk tampilan cepat"
        text poly_name "denormalized untuk tampilan cepat"
        timestamp created_at
    }

    medical_records {
        text id PK
        text patient_id FK
        text doctor_id FK "referensi users.id (akun Dokter yang login), bukan doctors.id"
        text subjective
        text blood_pressure
        text body_temperature
        text body_weight
        text body_height
        text assessment
        text plan
        text_array actions
        timestamp created_at
    }

    prescriptions {
        text id PK
        text medical_record_id FK
        text patient_id FK
        text medicine
        text dosage
        text notes
        timestamp created_at
    }

    users {
        text id PK
        text username UK
        text password "hashed (argon2id via Bun.password)"
        text role "Administrator | Dokter | Petugas Pendaftaran"
    }
```

## Keterangan

- Satu pasien dapat memiliki banyak pendaftaran kunjungan, banyak rekam medis, dan banyak resep.
- Satu pendaftaran kunjungan menghasilkan satu entri antrean (dibuat otomatis oleh backend saat pendaftaran disimpan).
- Satu rekam medis dapat memiliki banyak resep obat.
- `medical_records.doctor_id` merujuk ke `users(id)` — akun yang sedang login sebagai Dokter saat menulis catatan SOAP — **bukan** ke `doctors(id)` (katalog dokter yang dipakai saat memilih dokter di modul Pendaftaran). Ini penyederhanaan yang disengaja karena aplikasi tidak memetakan satu akun login ke satu baris dokter di katalog; lihat bagian "Asumsi & Penyederhanaan" di README.
- Semua foreign key di atas ditegakkan sebagai `REFERENCES` sungguhan di database (bukan hanya konvensi penamaan kolom) — percobaan menghapus baris yang masih direferensikan, atau menyisipkan referensi yang tidak valid, ditolak oleh Postgres dan diterjemahkan backend menjadi response error JSON yang konsisten (`success:false`, HTTP 409).
- `patients.medical_record_number` dijamin unik dan dibuat dari Postgres `SEQUENCE` (`patient_mrn_seq`), bukan `COUNT(*)` — sehingga tetap konsisten walau ada baris pasien yang dihapus.
- Role pengguna: `Administrator`, `Dokter`, `Petugas Pendaftaran`.
