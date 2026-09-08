-- Seed data for MCIS clinic system
-- You can run this after schema creation in PostgreSQL or MySQL-compatible DB.

INSERT INTO users (id, username, password, role) VALUES
  ('u-1', 'admin', 'admin123', 'Administrator'),
  ('u-2', 'dokter', 'dokter123', 'Dokter'),
  ('u-3', 'registrar', 'registrar123', 'Petugas Pendaftaran')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, name, specialty) VALUES
  ('d-1', 'dr. Isyana Wijaya', 'Dokter Umum'),
  ('d-2', 'dr. Fajar Nugraha', 'Dokter Gigi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_polyclinics (id, name) VALUES
  ('poly-1', 'Poli Umum'),
  ('poly-2', 'Poli Gigi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, medical_record_number, nik, name, gender, birth_date, phone, address) VALUES
  ('p-1001', 'MR-1001', '3201010101010001', 'Rina Permata', 'Perempuan', '1991-05-18', '081234567890', 'Jl. Cendana No. 12, Bandung'),
  ('p-1002', 'MR-1002', '3201010101010002', 'Budi Santoso', 'Laki-laki', '1987-09-02', '081876543210', 'Jl. Merdeka No. 35, Cimahi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO registrations (id, patient_id, doctor_id, poly_id, visit_date, payment_type, complaint, status) VALUES
  ('reg-1', 'p-1001', 'd-1', 'poly-1', '2026-09-07', 'BPJS', 'Batuk dan demam selama 2 hari', 'Menunggu'),
  ('reg-2', 'p-1002', 'd-1', 'poly-1', '2026-09-07', 'Cash', 'Sakit kepala dan pusing', 'Check In')
ON CONFLICT (id) DO NOTHING;

INSERT INTO queues (id, registration_id, queue_number, status, patient_name, poly_name) VALUES
  ('q-1', 'reg-1', 'A001', 'Menunggu', 'Rina Permata', 'Poli Umum'),
  ('q-2', 'reg-2', 'A002', 'Pemeriksaan', 'Budi Santoso', 'Poli Umum')
ON CONFLICT (id) DO NOTHING;

INSERT INTO medical_records (id, patient_id, doctor_id, subjective, blood_pressure, body_temperature, body_weight, body_height, assessment, plan, actions) VALUES
  ('mr-1', 'p-1001', 'd-1', 'Pasien mengeluh batuk berdahak sejak 2 hari lalu', '120/80', '37.5 C', '58 kg', '165 cm', 'Bronkitis akut', 'Istirahat dan minum obat sesuai resep', ARRAY['Tensimeter pasien normal', 'Suhu tubuh terpantau'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, medical_record_id, patient_id, medicine, dosage, notes) VALUES
  ('rx-1', 'mr-1', 'p-1001', 'Amoxicillin 500 mg', '3 x 1 tablet/hari', 'Diminum setelah makan')
ON CONFLICT (id) DO NOTHING;
