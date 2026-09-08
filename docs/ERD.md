# ERD Mini Clinic Information System

```mermaid
erDiagram
    users ||--o{ roles : has
    patients ||--o{ registrations : has
    doctors ||--o{ registrations : handles
    polyclinics ||--o{ registrations : serves
    registrations ||--o{ queues : contains
    patients ||--o{ medical_records : has
    doctors ||--o{ medical_records : writes
    medical_records ||--o{ prescriptions : contains

    patients {
        int id PK
        string medical_record_number
        string nik
        string name
        string gender
        date birth_date
        string phone
        text address
    }

    doctors {
        int id PK
        string name
        string specialty
    }

    polyclinics {
        int id PK
        string name
    }

    registrations {
        int id PK
        int patient_id FK
        int doctor_id FK
        int poly_id FK
        date visit_date
        string payment_type
        text complaint
        string status
    }

    queues {
        int id PK
        int registration_id FK
        string queue_number
        string status
    }

    medical_records {
        int id PK
        int patient_id FK
        int doctor_id FK
        text subjective
        string blood_pressure
        string body_temperature
        string weight
        string height
        text assessment
        text plan
        text actions
    }

    prescriptions {
        int id PK
        int medical_record_id FK
        int patient_id FK
        string medicine
        string dosage
        text notes
    }

    users {
        int id PK
        string username
        string password_hash
        string role
    }
```

## Keterangan

- Satu pasien dapat memiliki banyak pendaftaran kunjungan.
- Satu pendaftaran kunjungan dapat menghasilkan satu antrean.
- Satu pasien dapat memiliki banyak rekam medis.
- Satu rekam medis dapat memiliki banyak resep obat.
- Role pengguna terbagi menjadi Administrator, Dokter, dan Petugas Pendaftaran.
