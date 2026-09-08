CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Administrator', 'Dokter', 'Petugas Pendaftaran'))
);

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    medical_record_number VARCHAR(20) UNIQUE NOT NULL,
    nik VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
    birth_date DATE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(80) NOT NULL
);

CREATE TABLE polyclinics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);

CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT NOT NULL REFERENCES doctors(id),
    poly_id INT NOT NULL REFERENCES polyclinics(id),
    visit_date DATE NOT NULL,
    payment_type VARCHAR(30) NOT NULL,
    complaint TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Check In', 'Pemeriksaan', 'Selesai')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE queues (
    id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registrations(id),
    queue_number VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Check In', 'Pemeriksaan', 'Selesai')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT NOT NULL REFERENCES doctors(id),
    subjective TEXT NOT NULL,
    blood_pressure VARCHAR(20),
    body_temperature VARCHAR(20),
    body_weight VARCHAR(20),
    body_height VARCHAR(20),
    assessment TEXT NOT NULL,
    plan TEXT NOT NULL,
    actions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    medical_record_id INT NOT NULL REFERENCES medical_records(id),
    patient_id INT NOT NULL REFERENCES patients(id),
    medicine VARCHAR(120) NOT NULL,
    dosage VARCHAR(80) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$dummyhash', 'Administrator'),
('dokter', '$2b$10$dummyhash', 'Dokter'),
('registrar', '$2b$10$dummyhash', 'Petugas Pendaftaran');

INSERT INTO doctors (name, specialty) VALUES
('dr. Isyana Wijaya', 'Dokter Umum'),
('dr. Fajar Nugraha', 'Dokter Gigi');

INSERT INTO polyclinics (name) VALUES
('Poli Umum'),
('Poli Gigi');
