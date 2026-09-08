CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    medical_record_number TEXT NOT NULL UNIQUE,
    nik TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinic_polyclinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    poly_id TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    complaint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Menunggu',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queues (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL,
    queue_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Menunggu',
    patient_name TEXT NOT NULL,
    poly_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    subjective TEXT NOT NULL,
    blood_pressure TEXT NOT NULL DEFAULT '-',
    body_temperature TEXT NOT NULL DEFAULT '-',
    body_weight TEXT NOT NULL DEFAULT '-',
    body_height TEXT NOT NULL DEFAULT '-',
    assessment TEXT NOT NULL,
    plan TEXT NOT NULL,
    actions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    medical_record_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    medicine TEXT NOT NULL,
    dosage TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '-',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
