import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

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

const patients: Patient[] = [
	{
		id: "p-1001",
		medicalRecordNumber: "MR-1001",
		nik: "3201010101010001",
		name: "Rina Permata",
		gender: "Perempuan",
		birthDate: "1991-05-18",
		phone: "081234567890",
		address: "Jl. Cendana No. 12, Bandung",
	},
	{
		id: "p-1002",
		medicalRecordNumber: "MR-1002",
		nik: "3201010101010002",
		name: "Budi Santoso",
		gender: "Laki-laki",
		birthDate: "1987-09-02",
		phone: "081876543210",
		address: "Jl. Merdeka No. 35, Cimahi",
	},
];

const doctors = [
	{ id: "d-1", name: "dr. Isyana Wijaya", specialty: "Dokter Umum" },
	{ id: "d-2", name: "dr. Fajar Nugraha", specialty: "Dokter Gigi" },
];

const polyClinics = [
	{ id: "poly-1", name: "Poli Umum" },
	{ id: "poly-2", name: "Poli Gigi" },
];

const registrations: Registration[] = [
	{
		id: "reg-1",
		patientId: "p-1001",
		doctorId: "d-1",
		polyId: "poly-1",
		visitDate: "2026-09-07",
		paymentType: "BPJS",
		complaint: "Batuk dan demam selama 2 hari",
		status: "Menunggu",
	},
	{
		id: "reg-2",
		patientId: "p-1002",
		doctorId: "d-1",
		polyId: "poly-1",
		visitDate: "2026-09-07",
		paymentType: "Cash",
		complaint: "Sakit kepala dan pusing",
		status: "Check In",
	},
];

const queueEntries: QueueEntry[] = [
	{
		id: "q-1",
		registrationId: "reg-1",
		queueNumber: "A001",
		status: "Menunggu",
		patientName: "Rina Permata",
		polyName: "Poli Umum",
	},
	{
		id: "q-2",
		registrationId: "reg-2",
		queueNumber: "A002",
		status: "Pemeriksaan",
		patientName: "Budi Santoso",
		polyName: "Poli Umum",
	},
];

const medicalRecords: MedicalRecord[] = [
	{
		id: "mr-1",
		patientId: "p-1001",
		doctorId: "d-1",
		subjective: "Pasien mengeluh batuk berdahak sejak 2 hari lalu",
		objective: {
			bloodPressure: "120/80",
			bodyTemperature: "37.5 C",
			weight: "58 kg",
			height: "165 cm",
		},
		assessment: "Bronkitis akut",
		plan: "Istirahat dan minum obat sesuai resep",
		actions: ["Tensimeter pasien normal", "Suhu tubuh terpantau"],
		createdAt: "2026-09-07T09:00:00.000Z",
	},
];

const prescriptions: Prescription[] = [
	{
		id: "rx-1",
		medicalRecordId: "mr-1",
		patientId: "p-1001",
		medicine: "Amoxicillin 500 mg",
		dosage: "3 x 1 tablet/hari",
		notes: "Diminum setelah makan",
	},
];

const users: Array<{ id: string; username: string; password: string; role: UserRole }> = [
	{ id: "u-1", username: "admin", password: "admin123", role: "Administrator" },
	{ id: "u-2", username: "dokter", password: "dokter123", role: "Dokter" },
	{ id: "u-3", username: "registrar", password: "registrar123", role: "Petugas Pendaftaran" },
];

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

const generateMrNumber = () => `MR-${String(patients.length + 1).padStart(4, "0")}`;
const generateQueueNumber = () => `A${String(queueEntries.length + 1).padStart(3, "0")}`;

const toAuthUser = (user: (typeof users)[number]) => ({
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

app.get("/api/doctors", requireAuth, (_: Request, res: Response) => {
	res.json(apiSuccess(doctors));
});

app.get("/api/polyclinics", requireAuth, (_: Request, res: Response) => {
	res.json(apiSuccess(polyClinics));
});

app.post("/api/login", (req: Request, res: Response) => {
	const { username, password } = req.body as { username?: string; password?: string };
	const user = users.find(
		(item) => item.username === username && item.password === password,
	);

	if (!user) {
		res.status(401).json(apiError("Username atau password salah"));
		return;
	}

	const token = jwt.sign(toAuthUser(user), jwtSecret, { expiresIn: "8h" });
	res.json(apiSuccess({ token, user: toAuthUser(user) }, "Login berhasil"));
});

app.post("/api/logout", (_: Request, res: Response) => {
	res.json(apiSuccess({}, "Logout berhasil"));
});

app.get("/api/dashboard", requireAuth, (_: Request, res: Response) => {
	const totalPatients = patients.length;
	const todayPatients = registrations.length;
	const todayQueue = queueEntries.length;
	const waitingPatients = queueEntries.filter((item) => item.status === "Menunggu").length;
	const finishedPatients = queueEntries.filter((item) => item.status === "Selesai").length;

	res.json(
		apiSuccess({
			totalPatients,
			todayPatients,
			todayQueue,
			waitingPatients,
			finishedPatients,
		}),
	);
});

app.get("/api/patients", requireAuth, (req: Request, res: Response) => {
	const search = String(req.query.search ?? "").trim().toLowerCase();
	const page = Number(req.query.page ?? 1);
	const pageSize = Number(req.query.pageSize ?? 10);
	const filtered = patients.filter((patient) => {
		if (!search) return true;
		return [
			patient.name,
			patient.nik,
			patient.medicalRecordNumber,
			patient.phone,
		].some((value) => value.toLowerCase().includes(search));
	});

	const total = filtered.length;
	const start = (page - 1) * pageSize;
	const items = filtered.slice(start, start + pageSize);

	res.json(
		apiSuccess({
			total,
			page,
			pageSize,
			items,
		}),
	);
});

app.get("/api/patients/:id", requireAuth, (req: Request<{ id: string }>, res: Response) => {
	const patient = patients.find((item) => item.id === req.params.id);
	if (!patient) {
		res.status(404).json(apiError("Pasien tidak ditemukan"));
		return;
	}
	res.json(apiSuccess(patient));
});

app.post(
	"/api/patients",
	requireAuth,
	requireRole("Administrator", "Petugas Pendaftaran"),
	(req: Request, res: Response) => {
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
		const gender = payload.gender as Patient["gender"] | undefined;
		if (patients.some((patient) => patient.nik === nik)) {
			res.status(409).json(apiError("NIK tidak boleh duplikat"));
			return;
		}
		if (!gender || !["Laki-laki", "Perempuan"].includes(gender)) {
			res.status(400).json(apiError("Jenis kelamin tidak valid"));
			return;
		}

		const patient: Patient = {
			id: `p-${Date.now()}`,
			medicalRecordNumber: generateMrNumber(),
			nik,
			name,
			gender,
			birthDate,
			phone,
			address,
		};
		patients.push(patient);
		res.status(201).json(apiSuccess(patient, "Pasien berhasil ditambahkan"));
	},
);

app.put(
	"/api/patients/:id",
	requireAuth,
	requireRole("Administrator", "Petugas Pendaftaran"),
	(req: Request<{ id: string }>, res: Response) => {
		const index = patients.findIndex((patient) => patient.id === req.params.id);
		if (index === -1) {
			res.status(404).json(apiError("Pasien tidak ditemukan"));
			return;
		}
		const payload = req.body as Partial<Patient>;
		const existing = patients[index];
		if (!existing) {
			res.status(404).json(apiError("Pasien tidak ditemukan"));
			return;
		}
		const updated: Patient = {
			...existing,
			id: existing.id,
			medicalRecordNumber: existing.medicalRecordNumber,
			nik: payload.nik ?? existing.nik,
			name: payload.name ?? existing.name,
			gender: payload.gender ?? existing.gender,
			birthDate: payload.birthDate ?? existing.birthDate,
			phone: payload.phone ?? existing.phone,
			address: payload.address ?? existing.address,
		};
		patients[index] = updated;
		res.json(apiSuccess(updated, "Data pasien berhasil diperbarui"));
	},
);

app.delete(
	"/api/patients/:id",
	requireAuth,
	requireRole("Administrator"),
	(req: Request<{ id: string }>, res: Response) => {
		const patientIndex = patients.findIndex((patient) => patient.id === req.params.id);
		if (patientIndex === -1) {
			res.status(404).json(apiError("Pasien tidak ditemukan"));
			return;
		}
		patients.splice(patientIndex, 1);
		res.json(apiSuccess({}, "Pasien berhasil dihapus"));
	},
);

app.get("/api/registrations", requireAuth, (_: Request, res: Response) => {
	res.json(apiSuccess(registrations));
});

app.post(
	"/api/registrations",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	(req: Request, res: Response) => {
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

		const nextRegistration: Registration = {
			id: `reg-${Date.now()}`,
			patientId,
			doctorId,
			polyId,
			visitDate,
			paymentType,
			complaint,
			status: "Menunggu",
		};

		registrations.push(nextRegistration);
		const patient = patients.find((item) => item.id === nextRegistration.patientId);
		const poly = polyClinics.find((item) => item.id === nextRegistration.polyId);
		queueEntries.push({
			id: `q-${Date.now()}`,
			registrationId: nextRegistration.id,
			queueNumber: generateQueueNumber(),
			status: "Menunggu",
			patientName: patient?.name ?? "Pasien",
			polyName: poly?.name ?? "Poli",
		});
		res.status(201).json(apiSuccess(nextRegistration, "Pendaftaran pasien berhasil disimpan"));
	},
);

app.put(
	"/api/registrations/:id",
	requireAuth,
	requireRole("Petugas Pendaftaran", "Dokter"),
	(req: Request<{ id: string }>, res: Response) => {
		const registration = registrations.find((item) => item.id === req.params.id);
		if (!registration) {
			res.status(404).json(apiError("Registrasi tidak ditemukan"));
			return;
		}
		Object.assign(registration, req.body);
		res.json(apiSuccess(registration, "Registrasi berhasil diperbarui"));
	},
);

app.get("/api/queues", requireAuth, (_: Request, res: Response) => {
	res.json(apiSuccess(queueEntries));
});

app.post(
	"/api/queues",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	(req: Request, res: Response) => {
		const payload = req.body as Partial<QueueEntry>;
		const patient = patients.find((item) => item.id === payload.registrationId);
		if (!payload.registrationId || !patient) {
			res.status(400).json(apiError("Registrasi tidak valid"));
			return;
		}
		const entry: QueueEntry = {
			id: `q-${Date.now()}`,
			registrationId: payload.registrationId,
			queueNumber: generateQueueNumber(),
			status: "Menunggu",
			patientName: patient.name,
			polyName: "Poli Umum",
		};
		queueEntries.push(entry);
		res.status(201).json(apiSuccess(entry, "Antrean berhasil dibuat"));
	},
);

app.put(
	"/api/queues/:id/call",
	requireAuth,
	requireRole("Petugas Pendaftaran"),
	(req: Request<{ id: string }>, res: Response) => {
		const entry = queueEntries.find((item) => item.id === req.params.id);
		if (!entry) {
			res.status(404).json(apiError("Antrean tidak ditemukan"));
			return;
		}
		entry.status = "Pemeriksaan";
		res.json(apiSuccess(entry, "Antrean berikutnya dipanggil"));
	},
);

app.put(
	"/api/queues/:id/status",
	requireAuth,
	requireRole("Dokter", "Petugas Pendaftaran"),
	(req: Request<{ id: string }>, res: Response) => {
		const entry = queueEntries.find((item) => item.id === req.params.id);
		if (!entry) {
			res.status(404).json(apiError("Antrean tidak ditemukan"));
			return;
		}
		const status = String(req.body.status ?? "");
		if (!status) {
			res.status(400).json(apiError("Status belum diisi"));
			return;
		}
		entry.status = status as QueueEntry["status"];
		res.json(apiSuccess(entry, "Status antrean berhasil diubah"));
	},
);

app.post(
	"/api/medical-records",
	requireAuth,
	requireRole("Dokter"),
	(req: Request, res: Response) => {
		const payload = req.body as Partial<MedicalRecord>;
		const patientId = String(payload.patientId ?? "").trim();
		const subjective = String(payload.subjective ?? "").trim();
		const assessment = String(payload.assessment ?? "").trim();
		const plan = String(payload.plan ?? "").trim();
		if (!patientId || !subjective || !assessment || !plan) {
			res.status(400).json(apiError("Data rekam medis belum lengkap"));
			return;
		}
		const record: MedicalRecord = {
			id: `mr-${Date.now()}`,
			patientId,
			doctorId: payload.doctorId ?? "d-1",
			subjective,
			objective: payload.objective ?? {
				bloodPressure: "-",
				bodyTemperature: "-",
				weight: "-",
				height: "-",
			},
			assessment,
			plan,
			actions: payload.actions ?? [],
			createdAt: new Date().toISOString(),
		};
		medicalRecords.push(record);
		res.status(201).json(apiSuccess(record, "Rekam medis berhasil disimpan"));
	},
);

app.get("/api/medical-records/:patientId", requireAuth, (req: Request<{ patientId: string }>, res: Response) => {
	const recordList = medicalRecords.filter((record) => record.patientId === req.params.patientId);
	res.json(apiSuccess(recordList));
});

app.post(
	"/api/prescriptions",
	requireAuth,
	requireRole("Dokter"),
	(req: Request, res: Response) => {
		const payload = req.body as Partial<Prescription>;
		const medicalRecordId = String(payload.medicalRecordId ?? "").trim();
		const patientId = String(payload.patientId ?? "").trim();
		const medicine = String(payload.medicine ?? "").trim();
		const dosage = String(payload.dosage ?? "").trim();
		if (!medicalRecordId || !patientId || !medicine || !dosage) {
			res.status(400).json(apiError("Data resep obat belum lengkap"));
			return;
		}
		const prescription: Prescription = {
			id: `rx-${Date.now()}`,
			medicalRecordId,
			patientId,
			medicine,
			dosage,
			notes: payload.notes ?? "-",
		};
		prescriptions.push(prescription);
		res.status(201).json(apiSuccess(prescription, "Resep obat berhasil disimpan"));
	},
);

app.get("/api/prescriptions/:id", requireAuth, (req: Request<{ id: string }>, res: Response) => {
	const items = prescriptions.filter(
		(item) => item.id === req.params.id || item.medicalRecordId === req.params.id,
	);
	res.json(apiSuccess(items));
});

export function startServer(port = Number(process.env.PORT ?? 3001)) {
	return app.listen(port, () => {
		console.log(`Backend running at http://localhost:${port}`);
	});
}

if (import.meta.main) {
	startServer();
}
