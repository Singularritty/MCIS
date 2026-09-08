import { useCallback, useEffect, useState } from "react";
import {
	api,
	type MedicalRecord,
	type Patient,
	type Prescription,
} from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import type { Route } from "./+types/medical-records";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Pemeriksaan Dokter - MCIS" }];
}

const EMPTY_FORM = {
	subjective: "",
	bloodPressure: "120/80 mmHg",
	bodyTemperature: "36.5 C",
	weight: "",
	height: "",
	assessment: "",
	plan: "",
	actions: "",
	medicine: "",
	dosage: "",
	notes: "",
};

export default function MedicalRecordsPage() {
	const { token, user, can } = useAuth();
	const canRecord = can("Dokter");

	const [patients, setPatients] = useState<Patient[]>([]);
	const [patientId, setPatientId] = useState("");
	const [records, setRecords] = useState<MedicalRecord[]>([]);
	const [prescriptionsByRecord, setPrescriptionsByRecord] = useState<
		Record<string, Prescription[]>
	>({});
	const [form, setForm] = useState(EMPTY_FORM);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const loadPatients = useCallback(async () => {
		if (!token) return;
		try {
			const result = await api.patients.list(token, { pageSize: 100 });
			setPatients(result.items);
			setPatientId((current) => current || result.items[0]?.id || "");
		} catch (loadError) {
			setError(errorMessage(loadError, "Gagal memuat data pasien"));
		}
	}, [token]);

	useEffect(() => {
		void loadPatients();
	}, [loadPatients]);

	const loadHistory = useCallback(async () => {
		if (!token || !patientId) return;
		try {
			const history = await api.medicalRecords.listByPatient(token, patientId);
			setRecords(history);
			const entries = await Promise.all(
				history.map(
					async (record) =>
						[
							record.id,
							await api.prescriptions.listByMedicalRecord(token, record.id),
						] as const,
				),
			);
			setPrescriptionsByRecord(Object.fromEntries(entries));
			setError(null);
		} catch (loadError) {
			setError(errorMessage(loadError, "Gagal memuat riwayat pemeriksaan"));
		}
	}, [token, patientId]);

	useEffect(() => {
		void loadHistory();
	}, [loadHistory]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token || !user || !patientId) return;
		try {
			const record = await api.medicalRecords.create(token, {
				patientId,
				doctorId: user.id,
				subjective: form.subjective,
				objective: {
					bloodPressure: form.bloodPressure,
					bodyTemperature: form.bodyTemperature,
					weight: form.weight,
					height: form.height,
				},
				assessment: form.assessment,
				plan: form.plan,
				actions: form.actions
					.split(";")
					.map((action) => action.trim())
					.filter(Boolean),
			});

			if (form.medicine && form.dosage) {
				await api.prescriptions.create(token, {
					medicalRecordId: record.id,
					patientId,
					medicine: form.medicine,
					dosage: form.dosage,
					notes: form.notes,
				});
			}

			setStatus("Rekam medis berhasil disimpan");
			setForm(EMPTY_FORM);
			void loadHistory();
		} catch (submitError) {
			setStatus(errorMessage(submitError, "Gagal menyimpan rekam medis"));
		}
	};

	return (
		<section>
			<h2 className="section-title">Pemeriksaan Dokter</h2>

			<label className="patient-picker">
				<span>Pasien</span>
				<select
					value={patientId}
					onChange={(event) => setPatientId(event.target.value)}
				>
					{patients.map((patient) => (
						<option key={patient.id} value={patient.id}>
							{patient.name} ({patient.medicalRecordNumber})
						</option>
					))}
				</select>
			</label>

			{status && <p className="status-line">{status}</p>}
			{error && <p className="status-line error">{error}</p>}

			<div className="module-grid">
				{canRecord && (
					<div className="panel wide-panel">
						<h3>Form SOAP</h3>
						<form onSubmit={handleSubmit} className="form-grid">
							<label className="span-2">
								<span>Subjective &ndash; Keluhan Pasien</span>
								<textarea
									value={form.subjective}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											subjective: event.target.value,
										}))
									}
									rows={2}
									required
								/>
							</label>
							<label>
								<span>Objective &ndash; Tekanan Darah</span>
								<input
									value={form.bloodPressure}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											bloodPressure: event.target.value,
										}))
									}
									required
								/>
							</label>
							<label>
								<span>Objective &ndash; Suhu Tubuh</span>
								<input
									value={form.bodyTemperature}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											bodyTemperature: event.target.value,
										}))
									}
									required
								/>
							</label>
							<label>
								<span>Objective &ndash; Berat Badan</span>
								<input
									value={form.weight}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											weight: event.target.value,
										}))
									}
									placeholder="cth. 60 kg"
									required
								/>
							</label>
							<label>
								<span>Objective &ndash; Tinggi Badan</span>
								<input
									value={form.height}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											height: event.target.value,
										}))
									}
									placeholder="cth. 165 cm"
									required
								/>
							</label>
							<label className="span-2">
								<span>Assessment &ndash; Diagnosa</span>
								<textarea
									value={form.assessment}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											assessment: event.target.value,
										}))
									}
									rows={2}
									required
								/>
							</label>
							<label className="span-2">
								<span>Plan &ndash; Rencana Terapi</span>
								<textarea
									value={form.plan}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											plan: event.target.value,
										}))
									}
									rows={2}
									required
								/>
							</label>
							<label className="span-2">
								<span>Tindakan Medis (pisahkan dengan ;)</span>
								<textarea
									value={form.actions}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											actions: event.target.value,
										}))
									}
									rows={2}
								/>
							</label>
							<label>
								<span>Resep Obat</span>
								<input
									value={form.medicine}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											medicine: event.target.value,
										}))
									}
									placeholder="Nama obat"
								/>
							</label>
							<label>
								<span>Dosis</span>
								<input
									value={form.dosage}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											dosage: event.target.value,
										}))
									}
									placeholder="cth. 3 x 1 tablet/hari"
								/>
							</label>
							<label className="span-2">
								<span>Catatan Resep</span>
								<input
									value={form.notes}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											notes: event.target.value,
										}))
									}
									placeholder="cth. Diminum setelah makan"
								/>
							</label>
							<button type="submit" className="span-2">
								Simpan Rekam Medis
							</button>
						</form>
					</div>
				)}

				<div className="panel wide-panel">
					<h3>Riwayat Pemeriksaan Pasien</h3>
					{records.length === 0 && (
						<p className="empty-row">
							Belum ada riwayat pemeriksaan untuk pasien ini
						</p>
					)}
					<div className="record-list">
						{records.map((record) => (
							<article key={record.id} className="record-card">
								<header>
									<strong>
										{new Date(record.createdAt).toLocaleString("id-ID")}
									</strong>
								</header>
								<p>
									<strong>S:</strong> {record.subjective}
								</p>
								<p>
									<strong>O:</strong> TD {record.objective.bloodPressure}, Suhu{" "}
									{record.objective.bodyTemperature}, BB{" "}
									{record.objective.weight}, TB {record.objective.height}
								</p>
								<p>
									<strong>A:</strong> {record.assessment}
								</p>
								<p>
									<strong>P:</strong> {record.plan}
								</p>
								{record.actions.length > 0 && (
									<p>
										<strong>Tindakan:</strong> {record.actions.join(", ")}
									</p>
								)}
								{(prescriptionsByRecord[record.id]?.length ?? 0) > 0 && (
									<div className="prescription-list">
										<strong>Resep:</strong>
										<ul>
											{prescriptionsByRecord[record.id].map((prescription) => (
												<li key={prescription.id}>
													{prescription.medicine} &ndash; {prescription.dosage}{" "}
													({prescription.notes})
												</li>
											))}
										</ul>
									</div>
								)}
							</article>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
