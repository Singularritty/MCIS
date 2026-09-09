import { Pool } from "pg";
import { readEnv } from "./env";

const buildDatabaseUrl = () => {
	const databaseUrl = readEnv("DATABASE_URL");
	if (databaseUrl) {
		return databaseUrl;
	}
	const DB_HOST = readEnv("DB_HOST");
	const DB_PORT = readEnv("DB_PORT");
	const DB_NAME = readEnv("DB_NAME");
	const DB_USER = readEnv("DB_USER");
	const DB_PASSWORD = readEnv("DB_PASSWORD");
	if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
		throw new Error(
			"Database configuration must be set via DATABASE_URL, or all of DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, in the environment.",
		);
	}
	return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
};

export const pool = new Pool({
	connectionString: buildDatabaseUrl(),
	ssl: false,
});

let databaseInit: Promise<void> | null = null;

export const ensureDatabase = async () => {
	if (!databaseInit) {
		databaseInit = (async () => {
			await pool.query(`
				CREATE TABLE IF NOT EXISTS users (
					id TEXT PRIMARY KEY,
					username TEXT NOT NULL UNIQUE,
					password TEXT NOT NULL,
					role TEXT NOT NULL
				);
			`);

			await pool.query(`
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
			`);

			// Monotonically increasing source for medical_record_number, immune to
			// collisions from deleted patients (unlike a COUNT(*)-based generator).
			await pool.query(
				"CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START 1;",
			);

			await pool.query(`
				CREATE TABLE IF NOT EXISTS doctors (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					specialty TEXT NOT NULL
				);
			`);

			await pool.query(`
				CREATE TABLE IF NOT EXISTS clinic_polyclinics (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL
				);
			`);

			await pool.query(`
				CREATE TABLE IF NOT EXISTS registrations (
					id TEXT PRIMARY KEY,
					patient_id TEXT NOT NULL REFERENCES patients(id),
					doctor_id TEXT NOT NULL REFERENCES doctors(id),
					poly_id TEXT NOT NULL REFERENCES clinic_polyclinics(id),
					visit_date TEXT NOT NULL,
					payment_type TEXT NOT NULL,
					complaint TEXT NOT NULL,
					status TEXT NOT NULL DEFAULT 'Menunggu',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`);

			await pool.query(`
				CREATE TABLE IF NOT EXISTS queues (
					id TEXT PRIMARY KEY,
					registration_id TEXT NOT NULL REFERENCES registrations(id),
					queue_number TEXT NOT NULL,
					status TEXT NOT NULL DEFAULT 'Menunggu',
					patient_name TEXT NOT NULL,
					poly_name TEXT NOT NULL,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`);

			// doctor_id references the authenticated user who wrote the SOAP note
			// (role Dokter), not the doctors catalog used during registration/scheduling.
			await pool.query(`
				CREATE TABLE IF NOT EXISTS medical_records (
					id TEXT PRIMARY KEY,
					patient_id TEXT NOT NULL REFERENCES patients(id),
					doctor_id TEXT NOT NULL REFERENCES users(id),
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
			`);

			await pool.query(`
				CREATE TABLE IF NOT EXISTS prescriptions (
					id TEXT PRIMARY KEY,
					medical_record_id TEXT NOT NULL REFERENCES medical_records(id),
					patient_id TEXT NOT NULL REFERENCES patients(id),
					medicine TEXT NOT NULL,
					dosage TEXT NOT NULL,
					notes TEXT NOT NULL DEFAULT '-',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`);

			const userCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM users",
			);
			if (Number(userCount.rows[0].total) === 0) {
				const [adminHash, dokterHash, registrarHash] = await Promise.all([
					Bun.password.hash("admin123"),
					Bun.password.hash("dokter123"),
					Bun.password.hash("registrar123"),
				]);
				await pool.query(
					`INSERT INTO users (id, username, password, role) VALUES
					($1, 'admin', $2, 'Administrator'),
					($3, 'dokter', $4, 'Dokter'),
					($5, 'registrar', $6, 'Petugas Pendaftaran');`,
					["u-1", adminHash, "u-2", dokterHash, "u-3", registrarHash],
				);
			}

			const doctorCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM doctors",
			);
			if (Number(doctorCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO doctors (id, name, specialty) VALUES
					('d-1', 'dr. Isyana Wijaya', 'Dokter Umum'),
					('d-2', 'dr. Fajar Nugraha', 'Dokter Gigi');
				`);
			}

			const polyCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM clinic_polyclinics",
			);
			if (Number(polyCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO clinic_polyclinics (id, name) VALUES
					('poly-1', 'Poli Umum'),
					('poly-2', 'Poli Gigi');
				`);
			}

			const patientCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM patients",
			);
			if (Number(patientCount.rows[0].total) === 0) {
				// medical_record_number is drawn from patient_mrn_seq (the same
				// sequence used when patients are created via the app) so seed and
				// app-created patients share one continuous numbering scheme.
				await pool.query(`
					INSERT INTO patients (id, medical_record_number, nik, name, gender, birth_date, phone, address) VALUES
					('p-1001', 'MR-' || LPAD(nextval('patient_mrn_seq')::text, 4, '0'), '3201010101010001', 'Rina Permata', 'Perempuan', '1991-05-18', '081234567890', 'Jl. Cendana No. 12, Bandung'),
					('p-1002', 'MR-' || LPAD(nextval('patient_mrn_seq')::text, 4, '0'), '3201010101010002', 'Budi Santoso', 'Laki-laki', '1987-09-02', '081876543210', 'Jl. Merdeka No. 35, Cimahi');
				`);
			}

			const registrationCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM registrations",
			);
			if (Number(registrationCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO registrations (id, patient_id, doctor_id, poly_id, visit_date, payment_type, complaint, status) VALUES
					('reg-1', 'p-1001', 'd-1', 'poly-1', '2026-09-07', 'BPJS', 'Batuk dan demam selama 2 hari', 'Menunggu'),
					('reg-2', 'p-1002', 'd-1', 'poly-1', '2026-09-07', 'Cash', 'Sakit kepala dan pusing', 'Check In');
				`);
			}

			const queueCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM queues",
			);
			if (Number(queueCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO queues (id, registration_id, queue_number, status, patient_name, poly_name) VALUES
					('q-1', 'reg-1', 'A001', 'Menunggu', 'Rina Permata', 'Poli Umum'),
					('q-2', 'reg-2', 'A002', 'Pemeriksaan', 'Budi Santoso', 'Poli Umum');
				`);
			}

			const medicalRecordCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM medical_records",
			);
			if (Number(medicalRecordCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO medical_records (id, patient_id, doctor_id, subjective, blood_pressure, body_temperature, body_weight, body_height, assessment, plan, actions) VALUES
					('mr-1', 'p-1001', 'u-2', 'Pasien mengeluh batuk berdahak sejak 2 hari lalu', '120/80', '37.5 C', '58 kg', '165 cm', 'Bronkitis akut', 'Istirahat dan minum obat sesuai resep', ARRAY['Tensimeter pasien normal', 'Suhu tubuh terpantau']);
				`);
			}

			const prescriptionCount = await pool.query(
				"SELECT COUNT(*)::int AS total FROM prescriptions",
			);
			if (Number(prescriptionCount.rows[0].total) === 0) {
				await pool.query(`
					INSERT INTO prescriptions (id, medical_record_id, patient_id, medicine, dosage, notes) VALUES
					('rx-1', 'mr-1', 'p-1001', 'Amoxicillin 500 mg', '3 x 1 tablet/hari', 'Diminum setelah makan');
				`);
			}
		})();
	}
	await databaseInit;
};
