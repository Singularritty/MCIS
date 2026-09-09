import { ClipboardPlus, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Select } from "~/components/Select";
import { Skeleton } from "~/components/Skeleton";
import {
	api,
	type MedicalRecord,
	type Patient,
	type Prescription,
} from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import { useToast } from "~/lib/toast";
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
};

type PrescriptionRow = { medicine: string; dosage: string; notes: string };

const EMPTY_PRESCRIPTION_ROW: PrescriptionRow = {
	medicine: "",
	dosage: "",
	notes: "",
};

export default function MedicalRecordsPage() {
	const { token, user, can } = useAuth();
	const { showToast } = useToast();
	const canRecord = can("Dokter");

	const [patients, setPatients] = useState<Patient[]>([]);
	const [patientId, setPatientId] = useState("");
	const [records, setRecords] = useState<MedicalRecord[]>([]);
	const [prescriptionsByRecord, setPrescriptionsByRecord] = useState<
		Record<string, Prescription[]>
	>({});
	const [form, setForm] = useState(EMPTY_FORM);
	const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionRow[]>([
		EMPTY_PRESCRIPTION_ROW,
	]);
	const [loadingHistory, setLoadingHistory] = useState(true);
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
		} finally {
			setLoadingHistory(false);
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

			const filledRows = prescriptionRows.filter(
				(row) => row.medicine && row.dosage,
			);
			for (const row of filledRows) {
				await api.prescriptions.create(token, {
					medicalRecordId: record.id,
					patientId,
					medicine: row.medicine,
					dosage: row.dosage,
					notes: row.notes,
				});
			}

			showToast("Rekam medis berhasil disimpan");
			setForm(EMPTY_FORM);
			setPrescriptionRows([EMPTY_PRESCRIPTION_ROW]);
			void loadHistory();
		} catch (submitError) {
			showToast(
				errorMessage(submitError, "Gagal menyimpan rekam medis"),
				"error",
			);
		}
	};

	const updatePrescriptionRow = (
		index: number,
		field: keyof PrescriptionRow,
		value: string,
	) => {
		setPrescriptionRows((current) =>
			current.map((row, rowIndex) =>
				rowIndex === index ? { ...row, [field]: value } : row,
			),
		);
	};

	const addPrescriptionRow = () => {
		setPrescriptionRows((current) => [...current, EMPTY_PRESCRIPTION_ROW]);
	};

	const removePrescriptionRow = (index: number) => {
		setPrescriptionRows((current) => current.filter((_, i) => i !== index));
	};

	return (
		<section>
			<h2 className="section-title">Pemeriksaan Dokter</h2>

			<div className="patient-picker">
				<span id="record-patient-label">Pasien</span>
				<Select
					labelledBy="record-patient-label"
					value={patientId}
					onChange={setPatientId}
					options={patients.map((patient) => ({
						value: patient.id,
						label: `${patient.name} (${patient.medicalRecordNumber})`,
					}))}
				/>
			</div>

			{error && <p className="status-line error">{error}</p>}

			<div className="module-grid">
				{canRecord && (
					<div className="panel wide-panel">
						<h3>Form SOAP</h3>
						<form onSubmit={handleSubmit} className="form-grid">
							<label className="span-2">
								<span>Keluhan Pasien</span>
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
								<span>Tekanan Darah</span>
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
								<span>Suhu Tubuh</span>
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
								<span>Berat Badan</span>
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
								<span>Tinggi Badan</span>
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
								<span>Diagnosa</span>
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
								<span>Rencana Terapi</span>
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
							<div className="form-field span-2">
								<span>Resep Obat</span>
								<div className="prescription-rows">
									{prescriptionRows.map((row, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id, only reordered by add/remove at the end
										<div key={index} className="prescription-row">
											<input
												value={row.medicine}
												onChange={(event) =>
													updatePrescriptionRow(
														index,
														"medicine",
														event.target.value,
													)
												}
												placeholder="Nama obat"
												aria-label="Nama obat"
											/>
											<input
												value={row.dosage}
												onChange={(event) =>
													updatePrescriptionRow(
														index,
														"dosage",
														event.target.value,
													)
												}
												placeholder="cth. 3 x 1 tablet/hari"
												aria-label="Dosis"
											/>
											<input
												value={row.notes}
												onChange={(event) =>
													updatePrescriptionRow(
														index,
														"notes",
														event.target.value,
													)
												}
												placeholder="cth. Diminum setelah makan"
												aria-label="Catatan resep"
											/>
											<button
												type="button"
												className="icon-button"
												onClick={() => removePrescriptionRow(index)}
												disabled={prescriptionRows.length === 1}
												aria-label="Hapus obat ini"
											>
												<Trash2 size={16} strokeWidth={2.2} />
											</button>
										</div>
									))}
									<button
										type="button"
										className="add-row-button"
										onClick={addPrescriptionRow}
									>
										<Plus size={15} strokeWidth={2.4} />
										Tambah Obat
									</button>
								</div>
							</div>
							<button type="submit" className="span-2">
								<ClipboardPlus size={16} strokeWidth={2.4} />
								Simpan Rekam Medis
							</button>
						</form>
					</div>
				)}

				<div className="panel wide-panel">
					<h3>Riwayat Pemeriksaan Pasien</h3>
					{!loadingHistory && records.length === 0 && (
						<p className="empty-row">
							Belum ada riwayat pemeriksaan untuk pasien ini
						</p>
					)}
					<div className="record-list">
						{loadingHistory &&
							Array.from({ length: 2 }).map((_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows, no reordering
								<Skeleton key={`skeleton-${index}`} height={110} />
							))}
						{!loadingHistory &&
							records.map((record) => (
								<article key={record.id} className="record-card">
									<header>
										<strong>
											{new Date(record.createdAt).toLocaleString("id-ID")}
										</strong>
									</header>
									<p>
										<strong>Keluhan:</strong> {record.subjective}
									</p>
									<p>
										<strong>Pemeriksaan:</strong> TD{" "}
										{record.objective.bloodPressure}, Suhu{" "}
										{record.objective.bodyTemperature}, BB{" "}
										{record.objective.weight}, TB {record.objective.height}
									</p>
									<p>
										<strong>Diagnosa:</strong> {record.assessment}
									</p>
									<p>
										<strong>Rencana:</strong> {record.plan}
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
												{prescriptionsByRecord[record.id].map(
													(prescription) => (
														<li key={prescription.id}>
															{prescription.medicine} &ndash;{" "}
															{prescription.dosage} ({prescription.notes})
														</li>
													),
												)}
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
