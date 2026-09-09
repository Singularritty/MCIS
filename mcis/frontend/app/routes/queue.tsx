import { useCallback, useEffect, useState } from "react";
import { Select } from "~/components/Select";
import { StatusBadge } from "~/components/StatusBadge";
import {
	api,
	type QueueEntry,
	REGISTRATION_STATUSES,
	type Registration,
} from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import type { Route } from "./+types/queue";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Antrean Pasien - MCIS" }];
}

export default function QueuePage() {
	const { token, can } = useAuth();
	const canManageQueue = can("Petugas Pendaftaran");
	const canChangeStatus = can("Petugas Pendaftaran", "Dokter");

	const [queues, setQueues] = useState<QueueEntry[]>([]);
	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!token) return;
		try {
			const [queueData, registrationData] = await Promise.all([
				api.queues.list(token),
				api.registrations.list(token),
			]);
			setQueues(queueData);
			setRegistrations(registrationData);
			setError(null);
		} catch (loadError) {
			setError(errorMessage(loadError, "Gagal memuat antrean"));
		}
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	const registrationsWithoutQueue = registrations.filter(
		(registration) =>
			!queues.some((queue) => queue.registrationId === registration.id),
	);

	const nextWaiting = queues.find((queue) => queue.status === "Menunggu");

	const handleCallNext = async () => {
		if (!token || !nextWaiting) return;
		try {
			await api.queues.call(token, nextWaiting.id);
			setStatus(
				`Antrean ${nextWaiting.queueNumber} dipanggil ke ruang pemeriksaan`,
			);
			void load();
		} catch (callError) {
			setStatus(errorMessage(callError, "Gagal memanggil antrean berikutnya"));
		}
	};

	const handleGenerateQueue = async (registration: Registration) => {
		if (!token) return;
		try {
			const queue = await api.queues.create(token, registration.id);
			setStatus(`Nomor antrean ${queue.queueNumber} berhasil dibuat`);
			void load();
		} catch (createError) {
			setStatus(errorMessage(createError, "Gagal membuat nomor antrean"));
		}
	};

	const handleStatusChange = async (
		queue: QueueEntry,
		nextStatus: QueueEntry["status"],
	) => {
		if (!token) return;
		try {
			await api.queues.updateStatus(token, queue.id, nextStatus);
			setStatus(
				`Status antrean ${queue.queueNumber} diubah menjadi ${nextStatus}`,
			);
			void load();
		} catch (updateError) {
			setStatus(errorMessage(updateError, "Gagal mengubah status antrean"));
		}
	};

	return (
		<section>
			<div className="section-header">
				<h2 className="section-title">Antrean Pasien</h2>
				{canManageQueue && (
					<button
						type="button"
						onClick={handleCallNext}
						disabled={!nextWaiting}
					>
						{nextWaiting
							? `Panggil Antrean Berikutnya (${nextWaiting.queueNumber})`
							: "Tidak ada antrean menunggu"}
					</button>
				)}
			</div>

			{status && <p className="status-line">{status}</p>}
			{error && <p className="status-line error">{error}</p>}

			<div className="queue-list">
				{queues.map((queue) => (
					<div key={queue.id} className="queue-item">
						<strong>{queue.queueNumber}</strong>
						<span>
							{queue.patientName} &middot; {queue.polyName}
						</span>
						<StatusBadge status={queue.status} />
						{canChangeStatus && (
							<Select
								compact
								value={queue.status}
								onChange={(value) =>
									handleStatusChange(queue, value as QueueEntry["status"])
								}
								options={REGISTRATION_STATUSES.map((statusOption) => ({
									value: statusOption,
									label: statusOption,
								}))}
							/>
						)}
					</div>
				))}
				{queues.length === 0 && (
					<p className="empty-row">Belum ada antrean hari ini</p>
				)}
			</div>

			{canManageQueue && registrationsWithoutQueue.length > 0 && (
				<div className="panel">
					<h3>Buat Nomor Antrean</h3>
					<p className="subtext">
						Pendaftaran berikut belum memiliki nomor antrean.
					</p>
					<div className="queue-list">
						{registrationsWithoutQueue.map((registration) => (
							<div
								key={registration.id}
								className="queue-item queue-item-action"
							>
								<span>{registration.complaint}</span>
								<span>{registration.visitDate}</span>
								<button
									type="button"
									onClick={() => handleGenerateQueue(registration)}
								>
									Buat Antrean
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
