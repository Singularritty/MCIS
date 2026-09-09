import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "~/components/Avatar";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { Modal } from "~/components/Modal";
import { Select } from "~/components/Select";
import { Skeleton } from "~/components/Skeleton";
import { SortableHeader, type SortOrder } from "~/components/SortableHeader";
import { ApiError, api, type Patient } from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import { useToast } from "~/lib/toast";
import type { Route } from "./+types/patients";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Data Pasien - MCIS" }];
}

const EMPTY_FORM = {
	nik: "",
	name: "",
	gender: "Laki-laki" as Patient["gender"],
	birthDate: "",
	phone: "",
	address: "",
};

const PAGE_SIZE = 10;

type SortKey = "medicalRecordNumber" | "name" | "nik" | "gender" | "phone";

export default function PatientsPage() {
	const { token, can } = useAuth();
	const { showToast } = useToast();
	const canWrite = can("Administrator", "Petugas Pendaftaran");
	const canDelete = can("Administrator");

	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

	const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

	const load = useCallback(async () => {
		if (!token) return;
		try {
			const result = await api.patients.list(token, {
				search,
				page,
				pageSize: PAGE_SIZE,
				sortBy: sortKey ?? undefined,
				sortOrder,
			});
			setPatients(result.items);
			setTotal(result.total);
			setError(null);
		} catch (loadError) {
			setError(errorMessage(loadError, "Gagal memuat data pasien"));
		} finally {
			setLoading(false);
		}
	}, [token, search, page, sortKey, sortOrder]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortOrder("asc");
		}
		setPage(1);
	};

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setFormErrors({});
		setEditingId(null);
		setFormMode("create");
	};

	const openEdit = (patient: Patient) => {
		setForm({
			nik: patient.nik,
			name: patient.name,
			gender: patient.gender,
			birthDate: patient.birthDate,
			phone: patient.phone,
			address: patient.address,
		});
		setFormErrors({});
		setEditingId(patient.id);
		setFormMode("edit");
	};

	const closeForm = () => {
		setFormMode(null);
		setEditingId(null);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!token) return;
		setFormErrors({});
		try {
			if (formMode === "edit" && editingId) {
				await api.patients.update(token, editingId, form);
				showToast(`Data pasien ${form.name} berhasil diperbarui`);
			} else {
				await api.patients.create(token, form);
				showToast(`Pasien ${form.name} berhasil ditambahkan`);
			}
			closeForm();
			void load();
		} catch (submitError) {
			if (submitError instanceof ApiError && submitError.errors) {
				setFormErrors(submitError.errors);
			}
			showToast(
				errorMessage(submitError, "Gagal menyimpan data pasien"),
				"error",
			);
		}
	};

	const handleDelete = async (patient: Patient) => {
		if (!token) return;
		try {
			await api.patients.remove(token, patient.id);
			showToast(`Pasien ${patient.name} berhasil dihapus`);
			void load();
		} catch (deleteError) {
			showToast(errorMessage(deleteError, "Gagal menghapus pasien"), "error");
		}
	};

	return (
		<section>
			<div className="section-header">
				<h2 className="section-title">Data Pasien</h2>
				{canWrite && (
					<button type="button" onClick={openCreate}>
						<Plus size={16} strokeWidth={2.4} />
						Tambah Data
					</button>
				)}
			</div>

			<form
				className="search-bar"
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
					setSearch(searchInput);
				}}
			>
				<div className="icon-input">
					<Search size={16} strokeWidth={2.2} aria-hidden="true" />
					<input
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder="Cari nama, NIK, No. RM, atau telepon"
					/>
				</div>
				<button type="submit">Cari</button>
			</form>

			{error && <p className="status-line error">{error}</p>}

			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<SortableHeader
								label="No. RM"
								sortKey="medicalRecordNumber"
								activeKey={sortKey}
								order={sortOrder}
								onSort={handleSort}
							/>
							<SortableHeader
								label="Nama"
								sortKey="name"
								activeKey={sortKey}
								order={sortOrder}
								onSort={handleSort}
							/>
							<SortableHeader
								label="NIK"
								sortKey="nik"
								activeKey={sortKey}
								order={sortOrder}
								onSort={handleSort}
							/>
							<SortableHeader
								label="Jenis Kelamin"
								sortKey="gender"
								activeKey={sortKey}
								order={sortOrder}
								onSort={handleSort}
							/>
							<SortableHeader
								label="Telepon"
								sortKey="phone"
								activeKey={sortKey}
								order={sortOrder}
								onSort={handleSort}
							/>
							<th>Aksi</th>
						</tr>
					</thead>
					<tbody>
						{loading &&
							Array.from({ length: 4 }).map((_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows, no reordering
								<tr key={`skeleton-${index}`}>
									<td colSpan={6}>
										<Skeleton height={20} />
									</td>
								</tr>
							))}
						{!loading &&
							patients.map((patient) => (
								<tr key={patient.id}>
									<td>{patient.medicalRecordNumber}</td>
									<td>
										<div className="name-cell">
											<Avatar name={patient.name} />
											{patient.name}
										</div>
									</td>
									<td>{patient.nik}</td>
									<td>{patient.gender}</td>
									<td>{patient.phone}</td>
									<td className="row-actions">
										<button
											type="button"
											className="link-button"
											onClick={() => setDetailPatient(patient)}
										>
											<Eye size={15} strokeWidth={2.2} />
											Detail
										</button>
										{canWrite && (
											<button
												type="button"
												className="link-button"
												onClick={() => openEdit(patient)}
											>
												<Pencil size={15} strokeWidth={2.2} />
												Ubah
											</button>
										)}
										{canDelete && (
											<button
												type="button"
												className="link-button danger"
												onClick={() => setDeleteTarget(patient)}
											>
												<Trash2 size={15} strokeWidth={2.2} />
												Hapus
											</button>
										)}
									</td>
								</tr>
							))}
						{!loading && patients.length === 0 && (
							<tr>
								<td colSpan={6} className="empty-row">
									Tidak ada data pasien
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="pagination">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => setPage((current) => current - 1)}
				>
					Sebelumnya
				</button>
				<span>
					Halaman {page} dari {totalPages} ({total} pasien)
				</span>
				<button
					type="button"
					disabled={page >= totalPages}
					onClick={() => setPage((current) => current + 1)}
				>
					Berikutnya
				</button>
			</div>

			{formMode && (
				<Modal
					title={
						formMode === "edit" ? "Ubah Data Pasien" : "Tambah Data Pasien"
					}
					onClose={closeForm}
				>
					<form onSubmit={handleSubmit} className="form-grid">
						<label>
							<span>NIK</span>
							<input
								value={form.nik}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										nik: event.target.value,
									}))
								}
								required
							/>
							{formErrors.nik && (
								<small className="field-error">{formErrors.nik}</small>
							)}
						</label>
						<label>
							<span>Nama Pasien</span>
							<input
								value={form.name}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								required
							/>
						</label>
						<div className="form-field">
							<span id="patient-gender-label">Jenis Kelamin</span>
							<Select
								labelledBy="patient-gender-label"
								value={form.gender}
								onChange={(value) =>
									setForm((current) => ({
										...current,
										gender: value as Patient["gender"],
									}))
								}
								options={[
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" },
								]}
							/>
						</div>
						<label>
							<span>Tanggal Lahir</span>
							<input
								type="date"
								value={form.birthDate}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										birthDate: event.target.value,
									}))
								}
								required
							/>
						</label>
						<label>
							<span>Nomor Telepon</span>
							<input
								value={form.phone}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										phone: event.target.value,
									}))
								}
								required
							/>
						</label>
						<label className="span-2">
							<span>Alamat</span>
							<textarea
								value={form.address}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										address: event.target.value,
									}))
								}
								rows={3}
								required
							/>
						</label>
						<button type="submit" className="span-2">
							Simpan
						</button>
					</form>
				</Modal>
			)}

			{detailPatient && (
				<Modal title="Detail Pasien" onClose={() => setDetailPatient(null)}>
					<dl className="detail-list">
						<dt>No. Rekam Medis</dt>
						<dd>{detailPatient.medicalRecordNumber}</dd>
						<dt>NIK</dt>
						<dd>{detailPatient.nik}</dd>
						<dt>Nama</dt>
						<dd>{detailPatient.name}</dd>
						<dt>Jenis Kelamin</dt>
						<dd>{detailPatient.gender}</dd>
						<dt>Tanggal Lahir</dt>
						<dd>{detailPatient.birthDate}</dd>
						<dt>Nomor Telepon</dt>
						<dd>{detailPatient.phone}</dd>
						<dt>Alamat</dt>
						<dd>{detailPatient.address}</dd>
					</dl>
				</Modal>
			)}

			{deleteTarget && (
				<ConfirmDialog
					title="Hapus Data Pasien"
					message={`Yakin ingin menghapus data pasien ${deleteTarget.name}? Tindakan ini tidak bisa dibatalkan.`}
					confirmLabel="Ya, Hapus"
					danger
					onConfirm={() => handleDelete(deleteTarget)}
					onClose={() => setDeleteTarget(null)}
				/>
			)}
		</section>
	);
}
