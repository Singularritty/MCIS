export type UserRole = "Administrator" | "Dokter" | "Petugas Pendaftaran";

export type AuthUser = {
	id: string;
	username: string;
	role: UserRole;
};

export type Patient = {
	id: string;
	medicalRecordNumber: string;
	nik: string;
	name: string;
	gender: "Laki-laki" | "Perempuan";
	birthDate: string;
	phone: string;
	address: string;
};

export type PatientList = {
	total: number;
	page: number;
	pageSize: number;
	items: Patient[];
};

export type RegistrationStatus =
	| "Menunggu"
	| "Check In"
	| "Pemeriksaan"
	| "Selesai";

export type Registration = {
	id: string;
	patientId: string;
	doctorId: string;
	polyId: string;
	visitDate: string;
	paymentType: string;
	complaint: string;
	status: RegistrationStatus;
};

export type QueueEntry = {
	id: string;
	registrationId: string;
	queueNumber: string;
	status: RegistrationStatus;
	patientName: string;
	polyName: string;
};

export type MedicalRecord = {
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

export type Prescription = {
	id: string;
	medicalRecordId: string;
	patientId: string;
	medicine: string;
	dosage: string;
	notes: string;
};

export type Doctor = { id: string; name: string; specialty: string };
export type Polyclinic = { id: string; name: string };

export type Dashboard = {
	totalPatients: number;
	todayPatients: number;
	todayQueue: number;
	waitingPatients: number;
	finishedPatients: number;
};

type ApiEnvelope<T> = {
	success: boolean;
	message: string;
	data: T;
	errors?: Record<string, string>;
};

export class ApiError extends Error {
	errors?: Record<string, string>;
	status: number;

	constructor(
		message: string,
		status: number,
		errors?: Record<string, string>,
	) {
		super(message);
		this.status = status;
		this.errors = errors;
	}
}

// Set by AuthProvider so any 401 from any request (e.g. an expired token
// rejected mid-session) can force a logout + redirect to /login, not just
// leave the caller stuck showing a raw "Token tidak valid" error.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
	onUnauthorized = handler;
};

const apiRequest = async <T>(
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

	const payload = (await response.json()) as ApiEnvelope<T>;
	if (!response.ok || payload.success === false) {
		if (response.status === 401 && token) {
			onUnauthorized?.();
		}
		throw new ApiError(
			payload.message ?? "Terjadi kesalahan",
			response.status,
			payload.errors,
		);
	}

	return payload.data;
};

export const api = {
	login: (username: string, password: string) =>
		apiRequest<{ token: string; user: AuthUser }>("/api/login", null, {
			method: "POST",
			body: JSON.stringify({ username, password }),
		}),

	logout: (token: string) =>
		apiRequest<Record<string, never>>("/api/logout", token, { method: "POST" }),

	dashboard: (token: string) => apiRequest<Dashboard>("/api/dashboard", token),

	doctors: (token: string) => apiRequest<Doctor[]>("/api/doctors", token),

	polyclinics: (token: string) =>
		apiRequest<Polyclinic[]>("/api/polyclinics", token),

	patients: {
		list: (
			token: string,
			params: {
				search?: string;
				page?: number;
				pageSize?: number;
				sortBy?: string;
				sortOrder?: "asc" | "desc";
			} = {},
		) => {
			const query = new URLSearchParams();
			if (params.search) query.set("search", params.search);
			query.set("page", String(params.page ?? 1));
			query.set("pageSize", String(params.pageSize ?? 10));
			if (params.sortBy) query.set("sortBy", params.sortBy);
			if (params.sortOrder) query.set("sortOrder", params.sortOrder);
			return apiRequest<PatientList>(
				`/api/patients?${query.toString()}`,
				token,
			);
		},
		get: (token: string, id: string) =>
			apiRequest<Patient>(`/api/patients/${id}`, token),
		create: (
			token: string,
			payload: Omit<Patient, "id" | "medicalRecordNumber">,
		) =>
			apiRequest<Patient>("/api/patients", token, {
				method: "POST",
				body: JSON.stringify(payload),
			}),
		update: (
			token: string,
			id: string,
			payload: Partial<Omit<Patient, "id" | "medicalRecordNumber">>,
		) =>
			apiRequest<Patient>(`/api/patients/${id}`, token, {
				method: "PUT",
				body: JSON.stringify(payload),
			}),
		remove: (token: string, id: string) =>
			apiRequest<Record<string, never>>(`/api/patients/${id}`, token, {
				method: "DELETE",
			}),
	},

	registrations: {
		list: (token: string) =>
			apiRequest<Registration[]>("/api/registrations", token),
		create: (
			token: string,
			payload: {
				patientId: string;
				doctorId: string;
				polyId: string;
				visitDate: string;
				paymentType: string;
				complaint: string;
			},
		) =>
			apiRequest<Registration>("/api/registrations", token, {
				method: "POST",
				body: JSON.stringify(payload),
			}),
		updateStatus: (token: string, id: string, status: RegistrationStatus) =>
			apiRequest<Registration>(`/api/registrations/${id}`, token, {
				method: "PUT",
				body: JSON.stringify({ status }),
			}),
	},

	queues: {
		list: (token: string) => apiRequest<QueueEntry[]>("/api/queues", token),
		create: (token: string, registrationId: string) =>
			apiRequest<QueueEntry>("/api/queues", token, {
				method: "POST",
				body: JSON.stringify({ registrationId }),
			}),
		call: (token: string, id: string) =>
			apiRequest<QueueEntry>(`/api/queues/${id}/call`, token, {
				method: "PUT",
			}),
		updateStatus: (token: string, id: string, status: RegistrationStatus) =>
			apiRequest<QueueEntry>(`/api/queues/${id}/status`, token, {
				method: "PUT",
				body: JSON.stringify({ status }),
			}),
	},

	medicalRecords: {
		listByPatient: (token: string, patientId: string) =>
			apiRequest<MedicalRecord[]>(`/api/medical-records/${patientId}`, token),
		create: (
			token: string,
			payload: {
				patientId: string;
				doctorId: string;
				subjective: string;
				objective: MedicalRecord["objective"];
				assessment: string;
				plan: string;
				actions: string[];
			},
		) =>
			apiRequest<MedicalRecord>("/api/medical-records", token, {
				method: "POST",
				body: JSON.stringify(payload),
			}),
	},

	prescriptions: {
		listByMedicalRecord: (token: string, medicalRecordId: string) =>
			apiRequest<Prescription[]>(
				`/api/prescriptions/${medicalRecordId}`,
				token,
			),
		create: (
			token: string,
			payload: {
				medicalRecordId: string;
				patientId: string;
				medicine: string;
				dosage: string;
				notes?: string;
			},
		) =>
			apiRequest<Prescription>("/api/prescriptions", token, {
				method: "POST",
				body: JSON.stringify(payload),
			}),
	},
};

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
	"Menunggu",
	"Check In",
	"Pemeriksaan",
	"Selesai",
];
