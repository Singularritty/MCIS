import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { ensureDatabase, pool } from "./db";

type UserRole = "Administrator" | "Dokter" | "Petugas Pendaftaran";

type ApiEnvelope<T> = {
	success: boolean;
	message: string;
	data: T;
	errors?: Record<string, string>;
};

type Patient = {
	id: string;
	medicalRecordNumber: string;
	nik: string;
	name: string;
	gender: "Laki-laki" | "Perempuan";
	birthDate: string;
	phone: string;
	address: string;
};

type Registration = {
	id: string;
	patientId: string;
	doctorId: string;
	polyId: string;
	visitDate: string;
	paymentType: string;
	complaint: string;
	status: "Menunggu" | "Check In" | "Pemeriksaan" | "Selesai";
};

type QueueEntry = {
	id: string;
	registrationId: string;
	queueNumber: string;
	status: "Menunggu" | "Check In" | "Pemeriksaan" | "Selesai";
	patientName: string;
	polyName: string;
};

type MedicalRecord = {
	id: string;
	patientId: string;
	doctorId: string;
	subjective: string;
	objective: {
		bloodPressure: string;
		bodyTemperature: string;
		weight: string;
		height: string;
	};
	assessment: string;
	plan: string;
	actions: string[];
	createdAt: string;
};

type Prescription = {
	id: string;
	medicalRecordId: string;
	patientId: string;
	medicine: string;
	dosage: string;
	notes: string;
};

const findEnvFile = () => {
	let currentDir = process.cwd();
	for (let index = 0; index < 10; index += 1) {
		const envPath = path.join(currentDir, ".env");
		if (existsSync(envPath)) {
			return envPath;
		}
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			return null;
		}
		currentDir = parentDir;
	}
	return null;
};

const loadJwtSecret = () => {
	const envFile = findEnvFile();
	if (!envFile) {
		return undefined;
	}
	const rawContent = readFileSync(envFile, "utf8");
	const match = rawContent
		.split(/\r?\n/)
		.find((line) => line.trim().startsWith("JWT_SECRET="));
	if (!match) {
		return undefined;
	}
	const [, value] = match.split("=");
	return value?.trim().replace(/^['"]|['"]$/g, "");
};

const jwtSecret = process.env.JWT_SECRET ?? loadJwtSecret();

if (!jwtSecret) {
	throw new Error("JWT_SECRET must be configured in the environment before starting the backend.");
}

const apiSuccess = <T>(data: T, message = "Success"): ApiEnvelope<T> => ({
	success: true,
	message,
	data,
});

const apiError = (message: string, errors: Record<string, string> = {}): ApiEnvelope<null> => ({
	success: false,
	message,
	data: null,
	errors,
});

const toPatient = (row: Record<string, unknown>): Patient => ({
	id: String(row.id),
	medicalRecordNumber: String(row.medical_record_number),
	nik: String(row.nik),
	name: String(row.name),
	gender: String(row.gender) as Patient["gender"],
	birthDate: String(row.birth_date),
	phone: String(row.phone),
	address: String(row.address),
});

const toRegistration = (row: Record<string, unknown>): Registration => ({
	id: String(row.id),
	patientId: String(row.patient_id),
	doctorId: String(row.doctor_id),
	polyId: String(row.poly_id),
	visitDate: String(row.visit_date),
	paymentType: String(row.payment_type),
	complaint: String(row.complaint),
	status: String(row.status) as Registration["status"],
});

const toQueueEntry = (row: Record<string, unknown>): QueueEntry => ({
	id: String(row.id),
	registrationId: String(row.registration_id),
	queueNumber: String(row.queue_number),
	status: String(row.status) as QueueEntry["status"],
	patientName: String(row.patient_name),
	polyName: String(row.poly_name),
});

const toMedicalRecord = (row: Record<string, unknown>): MedicalRecord => ({
	id: String(row.id),
	patientId: String(row.patient_id),
	doctorId: String(row.doctor_id),
	subjective: String(row.subjective),
	objective: {
		bloodPressure: String(row.blood_pressure),
		bodyTemperature: String(row.body_temperature),
		weight: String(row.body_weight),
		height: String(row.body_height),
	},
	assessment: String(row.assessment),
	plan: String(row.plan),
	actions: Array.isArray(row.actions) ? row.actions.map(String) : [],
	createdAt: String(row.created_at),
});

const toPrescription = (row: Record<string, unknown>): Prescription => ({
	id: String(row.id),
	medicalRecordId: String(row.medical_record_id),
	patientId: String(row.patient_id),
	medicine: String(row.medicine),
	dosage: String(row.dosage),
	notes: String(row.notes),
});

const toAuthUser = (user: { id: string; username: string; role: UserRole }) => ({
	id: user.id,
	username: user.username,
	role: user.role,
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7) : "";

	if (!token) {
		res.status(401).json(apiError("Unauthorized"));
		return;
	}

	try {
		const decoded = jwt.verify(token, jwtSecret) as {
			id: string;
			username: string;
			role: UserRole;
		};
		(req as Request & { user?: typeof decoded }).user = decoded;
		next();
	} catch {
		res.status(401).json(apiError("Token tidak valid"));
	}
};

const requireRole = (...roles: UserRole[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const signedUser = (req as Request & { user?: { role?: UserRole } }).user;
		if (!signedUser || !roles.includes(signedUser.role ?? ("" as UserRole))) {
			res.status(403).json(apiError("Anda tidak memiliki akses ke fitur ini"));
			return;
		}
		next();
	};
};

export const app: Express = express();
app.use(express.json());

app.get("/api/health", (_: Request, res: Response) => {
	res.json(apiSuccess({ service: "mcis-clinic-system", status: "ok" }));
});

app.get("/api/doctors", requireAuth, async (_: Request, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM doctors ORDER BY name ASC");
	res.json(apiSuccess(result.rows.map((row) => ({ id: row.id, name: row.name, specialty: row.specialty }))));
});

app.get("/api/polyclinics", requireAuth, async (_: Request, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM clinic_polyclinics ORDER BY name ASC");
	res.json(apiSuccess(result.rows.map((row) => ({ id: row.id, name: row.name }))));
});

app.post("/api/login", async (req: Request, res: Response) => {
	await ensureDatabase();
	const { username, password } = req.body as { username?: string; password?: string };
	if (!username || !password) {
		res.status(400).json(apiError("Username dan password wajib diisi"));
		return;
	}
	const result = await pool.query(
		"SELECT id, username, password, role FROM users WHERE username = $1",
		[username],
	);
	const user = result.rows[0];
	if (!user || !(await Bun.password.verify(password, user.password))) {
		res.status(401).json(apiError("Username atau password salah"));
		return;
	}
	const authUser = { id: user.id, username: user.username, role: user.role as UserRole };
	const token = jwt.sign(authUser, jwtSecret, { expiresIn: "8h" });
	res.json(apiSuccess({ token, user: toAuthUser(authUser) }, "Login berhasil"));
});

app.post("/api/logout", (_: Request, res: Response) => {
	res.json(apiSuccess({}, "Logout berhasil"));
});

app.get("/api/dashboard", requireAuth, async (_: Request, res: Response) => {
	await ensureDatabase();
	const [totalPatients, todayPatients, todayQueue, waitingPatients, finishedPatients] = await Promise.all([
		pool.query("SELECT COUNT(*)::int AS total FROM patients"),
		pool.query("SELECT COUNT(*)::int AS total FROM registrations WHERE visit_date = CURRENT_DATE::text"),
		pool.query("SELECT COUNT(*)::int AS total FROM queues"),
		pool.query("SELECT COUNT(*)::int AS total FROM queues WHERE status = 'Menunggu'"),
		pool.query("SELECT COUNT(*)::int AS total FROM queues WHERE status = 'Selesai'"),
	]);
	res.json(
		apiSuccess({
			totalPatients: Number(totalPatients.rows[0].total),
			todayPatients: Number(todayPatients.rows[0].total),
			todayQueue: Number(todayQueue.rows[0].total),
			waitingPatients: Number(waitingPatients.rows[0].total),
			finishedPatients: Number(finishedPatients.rows[0].total),
		}),
	);
});

app.get("/api/patients", requireAuth, async (req: Request, res: Response) => {
	await ensureDatabase();
	const search = String(req.query.search ?? "").trim().toLowerCase();
	const page = Number(req.query.page ?? 1);
	const pageSize = Number(req.query.pageSize ?? 10);
	const values: string[] = [];
	let whereClause = "";
	if (search) {
		whereClause = `WHERE LOWER(name) LIKE $1 OR LOWER(nik) LIKE $1 OR LOWER(medical_record_number) LIKE $1 OR LOWER(phone) LIKE $1`;
		values.push(`%${search}%`);
	}
	const countQuery = `SELECT COUNT(*)::int AS total FROM patients ${whereClause}`;
	const countResult = await pool.query(countQuery, values);
	const total = Number(countResult.rows[0].total);
	const offset = (page - 1) * pageSize;
	const query = `SELECT * FROM patients ${whereClause} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
	const rows = await pool.query(query, [...values, String(pageSize), String(offset)]);
	res.json(apiSuccess({ total, page, pageSize, items: rows.rows.map(toPatient) }));
});

app.get("/api/patients/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
	const patient = result.rows[0];
	if (!patient) {
		res.status(404).json(apiError("Pasien tidak ditemukan"));
		return;
	}
	res.json(apiSuccess(toPatient(patient)));
});

app.post(
	"/api/patients",
	requireAuth,
	requireRole("Administrator", "Petugas Pendaftaran"),
	async (req: Request, res: Response) => {
		await ensureDatabase();
		const payload = req.body as Partial<Patient>;
		const requiredFields: Array<keyof Patient> = ["nik", "name", "gender", "birthDate", "phone", "address"];
		const missing = requiredFields.filter((field) => {
			const value = payload[field];
			return typeof value !== "string" || value.trim().length === 0;
		});
		if (missing.length > 0) {
			const field = missing[0];
			res.status(400).json(apiError("Validasi gagal", { [String(field)]: "Field wajib diisi" }));
			return;
		}
		const nik = String(payload.nik ?? "").trim();
		const name = String(payload.name ?? "").trim();
		const birthDate = String(payload.birthDate ?? "").trim();
		const phone = String(payload.phone ?? "").trim();
		const address = String(payload.address ?? "").trim();
		const gender = String(payload.gender ?? "").trim();
		if (!["Laki-laki", "Perempuan"].includes(gender)) {
			res.status(400).json(apiError("Jenis kelamin tidak valid"));
			return;
		}
		const duplicate = await pool.query("SELECT id FROM patients WHERE nik = $1", [nik]);
		if (duplicate.rows.length > 0) {
			res.status(409).json(apiError("NIK tidak boleh duplikat"));
			return;
		}
		const recordCount = await pool.query("SELECT COUNT(*)::int AS total FROM patients");
		const patientId = `p-${Date.now()}`;
		const medicalRecordNumber = `MR-${String(Number(recordCount.rows[0].total) + 1).padStart(4, "0")}`;
		const insertResult = await pool.query(
			"INSERT INTO patients (id, medical_record_number, nik, name, gender, birth_date, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
			[patientId, medicalRecordNumber, nik, name, gender, birthDate, phone, address],
		);
		res.status(201).json(apiSuccess(toPatient(insertResult.rows[0]), "Pasien berhasil ditambahkan"));
	},
);

app.put(
	"/api/patients/:id",
	requireAuth,
	requireRole("Administrator", "Petugas Pendaftaran"),
	async (req: Request<{ id: string }>, res: Response) => {
		await ensureDatabase();
		const existing = await pool.query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
		if (existing.rows.length === 0) {
			res.status(404).json(apiError("Pasien tidak ditemukan"));
			return;
		}
		const payload = req.body as Partial<Patient>;
		const update = {
			nik: payload.nik ?? existing.rows[0].nik,
			name: payload.name ?? existing.rows[0].name,
			gender: payload.gender ?? existing.rows[0].gender,
			birth_date: payload.birthDate ?? existing.rows[0].birth_date,
			phone: payload.phone ?? existing.rows[0].phone,
			address: payload.address ?? existing.rows[0].address,
		};
		const result = await pool.query(
			"UPDATE patients SET nik = $1, name = $2, gender = $3, birth_date = $4, phone = $5, address = $6 WHERE id = $7 RETURNING *",
			[update.nik, update.name, update.gender, update.birth_date, update.phone, update.address, req.params.id],
		);
		res.json(apiSuccess(toPatient(result.rows[0]), "Data pasien berhasil diperbarui"));
	},
);

app.delete(
	"/api/patients/:id",
	requireAuth,
	requireRole("Administrator"),
	async (req: Request<{ id: string }>, res: Response) => {
		await ensureDatabase();
		const result = await pool.query("DELETE FROM patients WHERE id = $1 RETURNING id", [req.params.id]);
		if (result.rows.length === 0) {
			res.status(404).json(apiError("Pasien tidak ditemukan"));
			return;
		}
		res.json(apiSuccess({}, "Pasien berhasil dihapus"));
	},
);

app.get("/api/registrations", requireAuth, async (_: Request, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM registrations ORDER BY created_at DESC");
	res.json(apiSuccess(result.rows.map(toRegistration)));
});

app.post(
	"/api/registrations",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	async (req: Request, res: Response) => {
		await ensureDatabase();
		const payload = req.body as Partial<Registration>;
		const patientId = String(payload.patientId ?? "").trim();
		const doctorId = String(payload.doctorId ?? "").trim();
		const polyId = String(payload.polyId ?? "").trim();
		const visitDate = String(payload.visitDate ?? "").trim();
		const paymentType = String(payload.paymentType ?? "").trim();
		const complaint = String(payload.complaint ?? "").trim();
		if (!patientId || !doctorId || !polyId || !visitDate || !paymentType || !complaint) {
			res.status(400).json(apiError("Data pendaftaran belum lengkap"));
			return;
		}
		const registrationId = `reg-${Date.now()}`;
		const insert = await pool.query(
			"INSERT INTO registrations (id, patient_id, doctor_id, poly_id, visit_date, payment_type, complaint, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Menunggu') RETURNING *",
			[registrationId, patientId, doctorId, polyId, visitDate, paymentType, complaint],
		);
		const patient = await pool.query("SELECT name FROM patients WHERE id = $1", [patientId]);
		const poly = await pool.query("SELECT name FROM clinic_polyclinics WHERE id = $1", [polyId]);
		const queueNumber = `A${String((await pool.query("SELECT COUNT(*)::int AS total FROM queues")).rows[0].total + 1).padStart(3, "0")}`;
		await pool.query(
			"INSERT INTO queues (id, registration_id, queue_number, status, patient_name, poly_name) VALUES ($1, $2, $3, 'Menunggu', $4, $5)",
			[`q-${Date.now()}`, registrationId, queueNumber, patient.rows[0]?.name ?? "Pasien", poly.rows[0]?.name ?? "Poli"],
		);
		res.status(201).json(apiSuccess(toRegistration(insert.rows[0]), "Pendaftaran pasien berhasil disimpan"));
	},
);

app.put(
	"/api/registrations/:id",
	requireAuth,
	requireRole("Petugas Pendaftaran", "Dokter"),
	async (req: Request<{ id: string }>, res: Response) => {
		await ensureDatabase();
		const existing = await pool.query("SELECT * FROM registrations WHERE id = $1", [req.params.id]);
		if (existing.rows.length === 0) {
			res.status(404).json(apiError("Registrasi tidak ditemukan"));
			return;
		}
		const payload = req.body as Partial<Registration>;
		const result = await pool.query(
			"UPDATE registrations SET patient_id = COALESCE($1, patient_id), doctor_id = COALESCE($2, doctor_id), poly_id = COALESCE($3, poly_id), visit_date = COALESCE($4, visit_date), payment_type = COALESCE($5, payment_type), complaint = COALESCE($6, complaint), status = COALESCE($7, status) WHERE id = $8 RETURNING *",
			[
				payload.patientId ?? null,
				payload.doctorId ?? null,
				payload.polyId ?? null,
				payload.visitDate ?? null,
				payload.paymentType ?? null,
				payload.complaint ?? null,
				payload.status ?? null,
				req.params.id,
			],
		);
		res.json(apiSuccess(toRegistration(result.rows[0]), "Registrasi berhasil diperbarui"));
	},
);

app.get("/api/queues", requireAuth, async (_: Request, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM queues ORDER BY queue_number ASC");
	res.json(apiSuccess(result.rows.map(toQueueEntry)));
});

app.post(
	"/api/queues",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	async (req: Request, res: Response) => {
		await ensureDatabase();
		const payload = req.body as Partial<QueueEntry>;
		if (!payload.registrationId) {
			res.status(400).json(apiError("Registrasi tidak valid"));
			return;
		}
		const registration = await pool.query("SELECT * FROM registrations WHERE id = $1", [payload.registrationId]);
		if (registration.rows.length === 0) {
			res.status(400).json(apiError("Registrasi tidak valid"));
			return;
		}
		const patient = await pool.query("SELECT name FROM patients WHERE id = $1", [registration.rows[0].patient_id]);
		const poly = await pool.query("SELECT name FROM clinic_polyclinics WHERE id = $1", [registration.rows[0].poly_id]);
		const queueNumber = `A${String((await pool.query("SELECT COUNT(*)::int AS total FROM queues")).rows[0].total + 1).padStart(3, "0")}`;
		const result = await pool.query(
			"INSERT INTO queues (id, registration_id, queue_number, status, patient_name, poly_name) VALUES ($1, $2, $3, 'Menunggu', $4, $5) RETURNING *",
			[`q-${Date.now()}`, payload.registrationId, queueNumber, patient.rows[0]?.name ?? "Pasien", poly.rows[0]?.name ?? "Poli"],
		);
		res.status(201).json(apiSuccess(toQueueEntry(result.rows[0]), "Antrean berhasil dibuat"));
	},
);

app.put(
	"/api/queues/:id/call",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	async (req: Request<{ id: string }>, res: Response) => {
		await ensureDatabase();
		const result = await pool.query("UPDATE queues SET status = 'Pemeriksaan' WHERE id = $1 RETURNING *", [req.params.id]);
		if (result.rows.length === 0) {
			res.status(404).json(apiError("Antrean tidak ditemukan"));
			return;
		}
		res.json(apiSuccess(toQueueEntry(result.rows[0]), "Antrean berikutnya dipanggil"));
	},
);

app.put(
	"/api/queues/:id/status",
	requireAuth,
	requireRole("Dokter", "Petugas Pendaftaran"),
	async (req: Request<{ id: string }>, res: Response) => {
		await ensureDatabase();
		const status = String(req.body.status ?? "");
		if (!status) {
			res.status(400).json(apiError("Status belum diisi"));
			return;
		}
		const result = await pool.query("UPDATE queues SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
		if (result.rows.length === 0) {
			res.status(404).json(apiError("Antrean tidak ditemukan"));
			return;
		}
		res.json(apiSuccess(toQueueEntry(result.rows[0]), "Status antrean berhasil diubah"));
	},
);

app.post(
	"/api/medical-records",
	requireAuth,
	requireRole("Dokter"),
	async (req: Request, res: Response) => {
		await ensureDatabase();
		const payload = req.body as Partial<MedicalRecord>;
		const patientId = String(payload.patientId ?? "").trim();
		const subjective = String(payload.subjective ?? "").trim();
		const assessment = String(payload.assessment ?? "").trim();
		const plan = String(payload.plan ?? "").trim();
		if (!patientId || !subjective || !assessment || !plan) {
			res.status(400).json(apiError("Data rekam medis belum lengkap"));
			return;
		}
		const doctorId = String(payload.doctorId ?? "d-1").trim();
		const objective = payload.objective ?? {
			bloodPressure: "-",
			bodyTemperature: "-",
			weight: "-",
			height: "-",
		};
		const recordId = `mr-${Date.now()}`;
		const result = await pool.query(
			"INSERT INTO medical_records (id, patient_id, doctor_id, subjective, blood_pressure, body_temperature, body_weight, body_height, assessment, plan, actions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
			[
				recordId,
				patientId,
				doctorId,
				subjective,
				objective.bloodPressure,
				objective.bodyTemperature,
				objective.weight,
				objective.height,
				assessment,
				plan,
				payload.actions ?? [],
			],
		);
		res.status(201).json(apiSuccess(toMedicalRecord(result.rows[0]), "Rekam medis berhasil disimpan"));
	},
);

app.get("/api/medical-records/:patientId", requireAuth, async (req: Request<{ patientId: string }>, res: Response) => {
	await ensureDatabase();
	const result = await pool.query("SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY created_at DESC", [req.params.patientId]);
	res.json(apiSuccess(result.rows.map(toMedicalRecord)));
});

app.post(
	"/api/prescriptions",
	requireAuth,
	requireRole("Dokter"),
	async (req: Request, res: Response) => {
		await ensureDatabase();
		const payload = req.body as Partial<Prescription>;
		const medicalRecordId = String(payload.medicalRecordId ?? "").trim();
		const patientId = String(payload.patientId ?? "").trim();
		const medicine = String(payload.medicine ?? "").trim();
		const dosage = String(payload.dosage ?? "").trim();
		if (!medicalRecordId || !patientId || !medicine || !dosage) {
			res.status(400).json(apiError("Data resep obat belum lengkap"));
			return;
		}
		const result = await pool.query(
			"INSERT INTO prescriptions (id, medical_record_id, patient_id, medicine, dosage, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
			[`rx-${Date.now()}`, medicalRecordId, patientId, medicine, dosage, payload.notes ?? "-"],
		);
		res.status(201).json(apiSuccess(toPrescription(result.rows[0]), "Resep obat berhasil disimpan"));
	},
);

app.get("/api/prescriptions/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
	await ensureDatabase();
	const result = await pool.query(
		"SELECT * FROM prescriptions WHERE id = $1 OR medical_record_id = $1 ORDER BY created_at DESC",
		[req.params.id],
	);
	res.json(apiSuccess(result.rows.map(toPrescription)));
});

export function startServer(port = Number(process.env.PORT ?? 3001)) {
	return app.listen(port, async () => {
		await ensureDatabase();
		console.log(`Backend running at http://localhost:${port}`);
	});
}

if (import.meta.main) {
	startServer();
}
