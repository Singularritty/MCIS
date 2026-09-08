import { useCallback, useEffect, useState } from "react";
import type { Route } from "./+types/home";

type Dashboard = {
	totalPatients: number;
	todayPatients: number;
	todayQueue: number;
	waitingPatients: number;
	finishedPatients: number;
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
	status: string;
};

type QueueItem = {
	id: string;
	registrationId: string;
	queueNumber: string;
	status: string;
	patientName: string;
	polyName: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

const apiRequest = async <T,>(
	url: string,
	token: string | null,
	init: RequestInit = {},
): Promise<T> => {
	const response = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	});

	const payload = (await response.json()) as ApiResponse<T> & { errors?: Record<string, string> };
	if (!response.ok || payload.success === false) {
		throw new Error(payload.message ?? "Terjadi kesalahan");
	}

	return payload.data;
};

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Mini Clinic Information System" },
		{ name: "description", content: "Sistem informasi klinik untuk pendaftaran, antrean, dan rekam medis." },
	];
}

export default function Home() {
	const [token, setToken] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem("mcis-token");
	});
	const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
		if (typeof window === "undefined") return null;
		const raw = window.localStorage.getItem("mcis-user");
		return raw ? JSON.parse(raw) as { username: string; role: string } : null;
	});
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [queues, setQueues] = useState<QueueItem[]>([]);
	const [status, setStatus] = useState("Silakan login untuk mulai menggunakan sistem");
	const [loginForm, setLoginForm] = useState({ username: "admin", password: "admin123" });
	const [patientForm, setPatientForm] = useState({
		nik: "",
		name: "",
		gender: "Laki-laki",
		birthDate: "",
		phone: "",
		address: "",
	});
	const [registrationForm, setRegistrationForm] = useState({
		patientId: "",
		doctorId: "d-1",
		polyId: "poly-1",
		visitDate: new Date().toISOString().slice(0, 10),
		paymentType: "BPJS",
		complaint: "",
	});
	const [recordForm, setRecordForm] = useState({
		patientId: "",
		subjective: "",
		bloodPressure: "120/80",
		bodyTemperature: "36.7 C",
		weight: "60 kg",
		height: "170 cm",
		assessment: "",
		plan: "",
		actions: "",
		medicine: "",
		dosage: "",
		notes: "",
	});

	const loadClinicData = useCallback(async () => {
		if (!token) return;

		try {
			const [dashboardData, patientData, registrationData, queueData] = await Promise.all([
				apiRequest<Dashboard>("/api/dashboard", token),
				apiRequest<{ items: Patient[] }>("/api/patients?page=1&pageSize=20", token),
				apiRequest<Registration[]>("/api/registrations", token),
				apiRequest<QueueItem[]>("/api/queues", token),
			]);

			setDashboard(dashboardData);
			setPatients(patientData.items ?? []);
			setRegistrations(registrationData ?? []);
			setQueues(queueData ?? []);
			if (!registrationData.length && patientData.items?.length) {
				setRegistrationForm((current) => ({ ...current, patientId: patientData.items[0].id }));
			}
			if (patientData.items?.length) {
				setRecordForm((current) => ({ ...current, patientId: patientData.items[0].id }));
			}
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Gagal memuat data klinik");
		}
	}, [token]);

	useEffect(() => {
		if (!token) return;
		void loadClinicData();
	}, [token, loadClinicData]);

	const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const payload = await apiRequest<{ token: string; user: { username: string; role: string } }>(
				"/api/login",
				null,
				{
					method: "POST",
					body: JSON.stringify(loginForm),
				},
			);
			setToken(payload.token);
			setUser(payload.user);
			window.localStorage.setItem("mcis-token", payload.token);
			window.localStorage.setItem("mcis-user", JSON.stringify(payload.user));
			setStatus(`Login berhasil untuk ${payload.user.username}`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Login gagal");
		}
	};

	const handleLogout = () => {
		setToken(null);
		setUser(null);
		window.localStorage.removeItem("mcis-token");
		window.localStorage.removeItem("mcis-user");
		setStatus("Anda telah logout dari sistem");
	};

	const handleCreatePatient = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		try {
			const patient = await apiRequest<Patient>("/api/patients", token, {
				method: "POST",
				body: JSON.stringify(patientForm),
			});
			setPatients((current) => [patient, ...current]);
			setPatientForm({
				nik: "",
				name: "",
				gender: "Laki-laki",
				birthDate: "",
				phone: "",
				address: "",
			});
			setStatus(`Pasien ${patient.name} berhasil ditambahkan`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Penambahan pasien gagal");
		}
	};

	const handleCreateRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		try {
			await apiRequest<Registration>("/api/registrations", token, {
				method: "POST",
				body: JSON.stringify(registrationForm),
			});
			setStatus("Pendaftaran pasien berhasil disimpan");
			setRegistrationForm((current) => ({ ...current, complaint: "" }));
			void loadClinicData();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Pendaftaran gagal");
		}
	};

	const handleCreateMedicalRecord = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		try {
			await apiRequest<unknown>("/api/medical-records", token, {
				method: "POST",
				body: JSON.stringify({
					patientId: recordForm.patientId,
					subjective: recordForm.subjective,
					objective: {
						bloodPressure: recordForm.bloodPressure,
						bodyTemperature: recordForm.bodyTemperature,
						weight: recordForm.weight,
						height: recordForm.height,
					},
					assessment: recordForm.assessment,
					plan: recordForm.plan,
					actions: recordForm.actions ? recordForm.actions.split(";") : [],
				}),
			});

			if (recordForm.medicine && recordForm.dosage) {
				await apiRequest<unknown>("/api/prescriptions", token, {
					method: "POST",
					body: JSON.stringify({
						medicalRecordId: `mr-${Date.now()}`,
						patientId: recordForm.patientId,
						medicine: recordForm.medicine,
						dosage: recordForm.dosage,
						notes: recordForm.notes,
					}),
				});
			}

			setStatus("Rekam medis dan resep obat berhasil disimpan");
			setRecordForm((current) => ({ ...current, subjective: "", assessment: "", plan: "", actions: "", medicine: "", dosage: "", notes: "" }));
			void loadClinicData();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Penyimpanan rekam medis gagal");
		}
	};

	if (!token || !user) {
		return (
			<main className="login-shell">
				<section className="login-card">
					<p className="eyebrow">MCIS</p>
					<h1>Mini Clinic Information System</h1>
					<p className="subtext">Login sebagai Administrator, Dokter, atau Petugas Pendaftaran.</p>
					<form onSubmit={handleLogin} className="login-form">
						<label>
							<span>Username</span>
							<input
								value={loginForm.username}
								onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
							/>
						</label>
						<label>
							<span>Password</span>
							<input
								type="password"
								value={loginForm.password}
								onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
							/>
						</label>
						<div className="login-actions">
							<button type="submit">Masuk</button>
						</div>
					</form>
					<div className="hint-box">
						<strong>Demo akun:</strong>
						<p>admin / admin123</p>
						<p>dokter / dokter123</p>
						<p>registrar / registrar123</p>
					</div>
					<p className="status-line">{status}</p>
				</section>
			</main>
		);
	}

	return (
		<main className="clinic-page">
			<header className="topbar">
				<div>
					<p className="eyebrow">MCIS</p>
					<h1>Mini Clinic Information System</h1>
				</div>
				<div className="topbar-meta">
					<span>{user.role}</span>
					<button type="button" onClick={handleLogout}>Logout</button>
				</div>
			</header>

			<section className="metrics-grid">
				<div className="metric-card accent">
					<p>Total Pasien</p>
					<h2>{dashboard?.totalPatients ?? 0}</h2>
				</div>
				<div className="metric-card">
					<p>Total Pasien Hari Ini</p>
					<h2>{dashboard?.todayPatients ?? 0}</h2>
				</div>
				<div className="metric-card">
					<p>Total Antrean Hari Ini</p>
					<h2>{dashboard?.todayQueue ?? 0}</h2>
				</div>
				<div className="metric-card">
					<p>Total Pasien Menunggu</p>
					<h2>{dashboard?.waitingPatients ?? 0}</h2>
				</div>
				<div className="metric-card">
					<p>Total Pasien Selesai Dilayani</p>
					<h2>{dashboard?.finishedPatients ?? 0}</h2>
				</div>
			</section>

			<p className="status-line">{status}</p>

			<section className="module-grid">
				<div className="panel">
					<h3>Data Pasien</h3>
					<form onSubmit={handleCreatePatient} className="form-grid">
						<input value={patientForm.nik} onChange={(event) => setPatientForm((current) => ({ ...current, nik: event.target.value }))} placeholder="NIK" />
						<input value={patientForm.name} onChange={(event) => setPatientForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama Pasien" />
						<select value={patientForm.gender} onChange={(event) => setPatientForm((current) => ({ ...current, gender: event.target.value as "Laki-laki" | "Perempuan" }))}>
							<option value="Laki-laki">Laki-laki</option>
							<option value="Perempuan">Perempuan</option>
						</select>
						<input type="date" value={patientForm.birthDate} onChange={(event) => setPatientForm((current) => ({ ...current, birthDate: event.target.value }))} />
						<input value={patientForm.phone} onChange={(event) => setPatientForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Nomor Telepon" />
						<textarea value={patientForm.address} onChange={(event) => setPatientForm((current) => ({ ...current, address: event.target.value }))} placeholder="Alamat" rows={3} />
						<button type="submit">Tambah Data</button>
					</form>
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>RM</th>
									<th>Nama</th>
									<th>NIK</th>
									<th>Telepon</th>
								</tr>
							</thead>
							<tbody>
								{patients.map((patient) => (
									<tr key={patient.id}>
										<td>{patient.medicalRecordNumber}</td>
										<td>{patient.name}</td>
										<td>{patient.nik}</td>
										<td>{patient.phone}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				<div className="panel">
					<h3>Pendaftaran Pasien</h3>
					<form onSubmit={handleCreateRegistration} className="form-grid">
						<select value={registrationForm.patientId} onChange={(event) => setRegistrationForm((current) => ({ ...current, patientId: event.target.value }))}>
							<option value="">Pilih Pasien</option>
							{patients.map((patient) => (
								<option key={patient.id} value={patient.id}>{patient.name}</option>
							))}
						</select>
						<select value={registrationForm.doctorId} onChange={(event) => setRegistrationForm((current) => ({ ...current, doctorId: event.target.value }))}>
							<option value="d-1">dr. Isyana Wijaya</option>
							<option value="d-2">dr. Fajar Nugraha</option>
						</select>
						<select value={registrationForm.polyId} onChange={(event) => setRegistrationForm((current) => ({ ...current, polyId: event.target.value }))}>
							<option value="poly-1">Poli Umum</option>
							<option value="poly-2">Poli Gigi</option>
						</select>
						<input type="date" value={registrationForm.visitDate} onChange={(event) => setRegistrationForm((current) => ({ ...current, visitDate: event.target.value }))} />
						<select value={registrationForm.paymentType} onChange={(event) => setRegistrationForm((current) => ({ ...current, paymentType: event.target.value }))}>
							<option value="BPJS">BPJS</option>
							<option value="Cash">Cash</option>
							<option value="Asuransi">Asuransi</option>
						</select>
						<textarea value={registrationForm.complaint} onChange={(event) => setRegistrationForm((current) => ({ ...current, complaint: event.target.value }))} placeholder="Keluhan awal" rows={3} />
						<button type="submit">Simpan Pendaftaran</button>
					</form>
				</div>

				<div className="panel">
					<h3>Antrean Pasien</h3>
					<div className="queue-list">
						{queues.map((queue) => (
							<div key={queue.id} className="queue-item">
								<strong>{queue.queueNumber}</strong>
								<span>{queue.patientName}</span>
								<small>{queue.polyName}</small>
								<span className="status-badge">{queue.status}</span>
							</div>
						))}
					</div>
				</div>

				<div className="panel">
					<h3>Pendaftaran Hari Ini</h3>
					<div className="queue-list">
						{registrations.slice(0, 4).map((registration) => (
							<div key={registration.id} className="queue-item">
								<strong>{registration.id}</strong>
								<span>{patients.find((patient) => patient.id === registration.patientId)?.name ?? "Pasien"}</span>
								<small>{registration.visitDate}</small>
								<span className="status-badge">{registration.status}</span>
							</div>
						))}
					</div>
				</div>

				<div className="panel wide-panel">
					<h3>Pemeriksaan Dokter (SOAP)</h3>
					<form onSubmit={handleCreateMedicalRecord} className="form-grid">
						<select value={recordForm.patientId} onChange={(event) => setRecordForm((current) => ({ ...current, patientId: event.target.value }))}>
							<option value="">Pilih Pasien</option>
							{patients.map((patient) => (
								<option key={patient.id} value={patient.id}>{patient.name}</option>
							))}
						</select>
						<textarea value={recordForm.subjective} onChange={(event) => setRecordForm((current) => ({ ...current, subjective: event.target.value }))} placeholder="Subjective (Keluhan pasien)" rows={3} />
						<div className="mini-grid">
							<input value={recordForm.bloodPressure} onChange={(event) => setRecordForm((current) => ({ ...current, bloodPressure: event.target.value }))} placeholder="Tekanan Darah" />
							<input value={recordForm.bodyTemperature} onChange={(event) => setRecordForm((current) => ({ ...current, bodyTemperature: event.target.value }))} placeholder="Suhu Tubuh" />
							<input value={recordForm.weight} onChange={(event) => setRecordForm((current) => ({ ...current, weight: event.target.value }))} placeholder="Berat Badan" />
							<input value={recordForm.height} onChange={(event) => setRecordForm((current) => ({ ...current, height: event.target.value }))} placeholder="Tinggi Badan" />
						</div>
						<textarea value={recordForm.assessment} onChange={(event) => setRecordForm((current) => ({ ...current, assessment: event.target.value }))} placeholder="Assessment (Diagnosa)" rows={2} />
						<textarea value={recordForm.plan} onChange={(event) => setRecordForm((current) => ({ ...current, plan: event.target.value }))} placeholder="Plan (Rencana terapi)" rows={2} />
						<textarea value={recordForm.actions} onChange={(event) => setRecordForm((current) => ({ ...current, actions: event.target.value }))} placeholder="Input Tindakan Medis (pisahkan dengan ; )" rows={2} />
						<div className="mini-grid">
							<input value={recordForm.medicine} onChange={(event) => setRecordForm((current) => ({ ...current, medicine: event.target.value }))} placeholder="Resep Obat" />
							<input value={recordForm.dosage} onChange={(event) => setRecordForm((current) => ({ ...current, dosage: event.target.value }))} placeholder="Dosis" />
							<input value={recordForm.notes} onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Catatan" />
						</div>
						<button type="submit">Simpan Rekam Medis</button>
					</form>
				</div>
			</section>
		</main>
	);
}
