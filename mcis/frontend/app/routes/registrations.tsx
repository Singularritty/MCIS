import { ClipboardPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "~/components/Avatar";
import { Select } from "~/components/Select";
import { Skeleton } from "~/components/Skeleton";
import { SortableHeader, type SortOrder } from "~/components/SortableHeader";
import { StatusBadge } from "~/components/StatusBadge";
import {
	api,
	type Doctor,
	type Patient,
	type Polyclinic,
	REGISTRATION_STATUSES,
	type Registration,
} from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import { useToast } from "~/lib/toast";
import type { Route } from "./+types/registrations";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Pendaftaran Pasien - MCIS" }];
}

const EMPTY_FORM = {
	patientId: "",
	doctorId: "",
	polyId: "",
	visitDate: new Date().toISOString().slice(0, 10),
	paymentType: "BPJS",
	complaint: "",
};

type SortKey =
	| "patient"
	| "doctor"
	| "poly"
	| "visitDate"
	| "paymentType"
	| "status";

export default function RegistrationsPage() {
	const { token, can } = useAuth();
	const { showToast } = useToast();
	const canCreate = can("Petugas Pendaftaran");
	const canChangeStatus = can("Petugas Pendaftaran", "Dokter");

	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
	const [form, setForm] = useState(EMPTY_FORM);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

	const load = useCallback(async () => {
		if (!token) return;
		try {
			const [registrationData, patientData, doctorData, polyData] =
				await Promise.all([
					api.registrations.list(token),
					api.patients.list(token, { pageSize: 100 }),
					api.doctors(token),
					api.polyclinics(token),
				]);
			setRegistrations(registrationData);
			setPatients(patientData.items);
			setDoctors(doctorData);
			setPolyclinics(polyData);
			setForm((current) => ({
				...current,
				patientId: current.patientId || patientData.items[0]?.id || "",
				doctorId: current.doctorId || doctorData[0]?.id || "",
				polyId: current.polyId || polyData[0]?.id || "",
			}));
			setError(null);
		} catch (loadError) {
			setError(errorMessage(loadError, "Gagal memuat data pendaftaran"));
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	const patientName = (id: string) =>
		patients.find((patient) => patient.id === id)?.name ?? id;
	const doctorName = (id: string) =>
		doctors.find((doctor) => doctor.id === id)?.name ?? id;
	const polyName = (id: string) =>
		polyclinics.find((poly) => poly.id === id)?.name ?? id;

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortOrder("asc");
		}
	};

	const sortedRegistrations = useMemo(() => {
		if (!sortKey) return registrations;
		const sortValueOf = (registration: Registration) => {
			switch (sortKey) {
				case "patient":
					return (
						patients.find((patient) => patient.id === registration.patientId)
							?.name ?? registration.patientId
					);
				case "doctor":
					return (
						doctors.find((doctor) => doctor.id === registration.doctorId)
							?.name ?? registration.doctorId
					);
				case "poly":
					return (
						polyclinics.find((poly) => poly.id === registration.polyId)?.name ??
						registration.polyId
					);
				case "visitDate":
					return registration.visitDate;
				case "paymentType":
					return registration.paymentType;
				case "status":
					return registration.status;
			}
		};
		const sorted = [...registrations].sort((a, b) =>
			sortValueOf(a).localeCompare(sortValueOf(b), "id"),
		);
		return sortOrder === "asc" ? sorted : sorted.reverse();
	}, [registrations, sortKey, sortOrder, patients, doctors, polyclinics]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		if (!form.patientId || !form.doctorId || !form.polyId) {
			showToast("Pasien, dokter, dan poli wajib dipilih", "error");
			return;
		}
		try {
			await api.registrations.create(token, form);
			showToast("Pendaftaran pasien berhasil disimpan");
			setForm((current) => ({ ...current, complaint: "" }));
			void load();
		} catch (submitError) {
			showToast(
				errorMessage(submitError, "Pendaftaran gagal disimpan"),
				"error",
			);
		}
	};

	const handleStatusChange = async (
		registration: Registration,
		nextStatus: Registration["status"],
	) => {
		if (!token) return;
		try {
			await api.registrations.updateStatus(token, registration.id, nextStatus);
			showToast(
				`Status pendaftaran ${patientName(registration.patientId)} diubah menjadi ${nextStatus}`,
			);
			void load();
		} catch (updateError) {
			showToast(
				errorMessage(updateError, "Gagal mengubah status pendaftaran"),
				"error",
			);
		}
	};

	return (
		<section>
			<h2 className="section-title">Pendaftaran Pasien</h2>

			{error && <p className="status-line error">{error}</p>}

			<div className="module-grid">
				{canCreate && (
					<div className="panel">
						<h3>Form Pendaftaran</h3>
						<form onSubmit={handleSubmit} className="form-grid">
							<div className="form-field">
								<span id="reg-patient-label">Pasien</span>
								<Select
									labelledBy="reg-patient-label"
									value={form.patientId}
									onChange={(value) =>
										setForm((current) => ({ ...current, patientId: value }))
									}
									placeholder="Pilih Pasien"
									options={patients.map((patient) => ({
										value: patient.id,
										label: patient.name,
									}))}
								/>
							</div>
							<div className="form-field">
								<span id="reg-doctor-label">Dokter</span>
								<Select
									labelledBy="reg-doctor-label"
									value={form.doctorId}
									onChange={(value) =>
										setForm((current) => ({ ...current, doctorId: value }))
									}
									placeholder="Pilih Dokter"
									options={doctors.map((doctor) => ({
										value: doctor.id,
										label: doctor.name,
									}))}
								/>
							</div>
							<div className="form-field">
								<span id="reg-poly-label">Poli</span>
								<Select
									labelledBy="reg-poly-label"
									value={form.polyId}
									onChange={(value) =>
										setForm((current) => ({ ...current, polyId: value }))
									}
									placeholder="Pilih Poli"
									options={polyclinics.map((poly) => ({
										value: poly.id,
										label: poly.name,
									}))}
								/>
							</div>
							<label>
								<span>Tanggal Kunjungan</span>
								<input
									type="date"
									value={form.visitDate}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											visitDate: event.target.value,
										}))
									}
									required
								/>
							</label>
							<div className="form-field span-2">
								<span id="reg-payment-label">Jenis Pembayaran</span>
								<Select
									labelledBy="reg-payment-label"
									value={form.paymentType}
									onChange={(value) =>
										setForm((current) => ({ ...current, paymentType: value }))
									}
									options={[
										{ value: "BPJS", label: "BPJS" },
										{ value: "Cash", label: "Cash" },
										{ value: "Asuransi", label: "Asuransi" },
									]}
								/>
							</div>
							<label className="span-2">
								<span>Keluhan Awal</span>
								<textarea
									value={form.complaint}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											complaint: event.target.value,
										}))
									}
									rows={3}
									required
								/>
							</label>
							<button type="submit" className="span-2">
								<ClipboardPlus size={16} strokeWidth={2.4} />
								Simpan Pendaftaran
							</button>
						</form>
					</div>
				)}

				<div className="panel wide-panel">
					<h3>Daftar Kunjungan</h3>
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<SortableHeader
										label="Pasien"
										sortKey="patient"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									<SortableHeader
										label="Dokter"
										sortKey="doctor"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									<SortableHeader
										label="Poli"
										sortKey="poly"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									<SortableHeader
										label="Tanggal"
										sortKey="visitDate"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									<SortableHeader
										label="Pembayaran"
										sortKey="paymentType"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									<th>Keluhan</th>
									<SortableHeader
										label="Status"
										sortKey="status"
										activeKey={sortKey}
										order={sortOrder}
										onSort={handleSort}
									/>
									{canChangeStatus && <th>Aksi</th>}
								</tr>
							</thead>
							<tbody>
								{loading &&
									Array.from({ length: 3 }).map((_, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows, no reordering
										<tr key={`skeleton-${index}`}>
											<td colSpan={canChangeStatus ? 8 : 7}>
												<Skeleton height={20} />
											</td>
										</tr>
									))}
								{!loading &&
									sortedRegistrations.map((registration) => (
										<tr key={registration.id}>
											<td>
												<div className="name-cell">
													<Avatar name={patientName(registration.patientId)} />
													{patientName(registration.patientId)}
												</div>
											</td>
											<td>{doctorName(registration.doctorId)}</td>
											<td>{polyName(registration.polyId)}</td>
											<td>{registration.visitDate}</td>
											<td>{registration.paymentType}</td>
											<td>{registration.complaint}</td>
											<td>
												<StatusBadge status={registration.status} />
											</td>
											{canChangeStatus && (
												<td>
													<Select
														compact
														value={registration.status}
														onChange={(value) =>
															handleStatusChange(
																registration,
																value as Registration["status"],
															)
														}
														options={REGISTRATION_STATUSES.map(
															(statusOption) => ({
																value: statusOption,
																label: statusOption,
															}),
														)}
													/>
												</td>
											)}
										</tr>
									))}
								{!loading && registrations.length === 0 && (
									<tr>
										<td colSpan={canChangeStatus ? 8 : 7} className="empty-row">
											Belum ada pendaftaran
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	);
}
