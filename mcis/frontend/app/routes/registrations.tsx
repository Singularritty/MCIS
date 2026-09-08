import { useCallback, useEffect, useState } from "react";
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

export default function RegistrationsPage() {
	const { token, can } = useAuth();
	const canCreate = can("Petugas Pendaftaran");
	const canChangeStatus = can("Petugas Pendaftaran", "Dokter");

	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
	const [form, setForm] = useState(EMPTY_FORM);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

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

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		try {
			await api.registrations.create(token, form);
			setStatus("Pendaftaran pasien berhasil disimpan");
			setForm((current) => ({ ...current, complaint: "" }));
			void load();
		} catch (submitError) {
			setStatus(errorMessage(submitError, "Pendaftaran gagal disimpan"));
		}
	};

	const handleStatusChange = async (
		registration: Registration,
		nextStatus: Registration["status"],
	) => {
		if (!token) return;
		try {
			await api.registrations.updateStatus(token, registration.id, nextStatus);
			setStatus(
				`Status pendaftaran ${registration.id} diubah menjadi ${nextStatus}`,
			);
			void load();
		} catch (updateError) {
			setStatus(errorMessage(updateError, "Gagal mengubah status pendaftaran"));
		}
	};

	return (
		<section>
			<h2 className="section-title">Pendaftaran Pasien</h2>

			{status && <p className="status-line">{status}</p>}
			{error && <p className="status-line error">{error}</p>}

			<div className="module-grid">
				{canCreate && (
					<div className="panel">
						<h3>Form Pendaftaran</h3>
						<form onSubmit={handleSubmit} className="form-grid">
							<label>
								<span>Pasien</span>
								<select
									value={form.patientId}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											patientId: event.target.value,
										}))
									}
									required
								>
									<option value="">Pilih Pasien</option>
									{patients.map((patient) => (
										<option key={patient.id} value={patient.id}>
											{patient.name}
										</option>
									))}
								</select>
							</label>
							<label>
								<span>Dokter</span>
								<select
									value={form.doctorId}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											doctorId: event.target.value,
										}))
									}
									required
								>
									{doctors.map((doctor) => (
										<option key={doctor.id} value={doctor.id}>
											{doctor.name}
										</option>
									))}
								</select>
							</label>
							<label>
								<span>Poli</span>
								<select
									value={form.polyId}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											polyId: event.target.value,
										}))
									}
									required
								>
									{polyclinics.map((poly) => (
										<option key={poly.id} value={poly.id}>
											{poly.name}
										</option>
									))}
								</select>
							</label>
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
							<label>
								<span>Jenis Pembayaran</span>
								<select
									value={form.paymentType}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											paymentType: event.target.value,
										}))
									}
								>
									<option value="BPJS">BPJS</option>
									<option value="Cash">Cash</option>
									<option value="Asuransi">Asuransi</option>
								</select>
							</label>
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
									<th>Pasien</th>
									<th>Dokter</th>
									<th>Poli</th>
									<th>Tanggal</th>
									<th>Pembayaran</th>
									<th>Keluhan</th>
									<th>Status</th>
									{canChangeStatus && <th>Aksi</th>}
								</tr>
							</thead>
							<tbody>
								{registrations.map((registration) => (
									<tr key={registration.id}>
										<td>{patientName(registration.patientId)}</td>
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
												<select
													value={registration.status}
													onChange={(event) =>
														handleStatusChange(
															registration,
															event.target.value as Registration["status"],
														)
													}
												>
													{REGISTRATION_STATUSES.map((statusOption) => (
														<option key={statusOption} value={statusOption}>
															{statusOption}
														</option>
													))}
												</select>
											</td>
										)}
									</tr>
								))}
								{registrations.length === 0 && (
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
