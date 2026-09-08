import { useEffect, useState } from "react";
import { StatCard } from "~/components/StatCard";
import { api, type Dashboard } from "~/lib/api";
import { errorMessage, useAuth } from "~/lib/auth";
import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Dashboard - MCIS" }];
}

export default function DashboardPage() {
	const { token } = useAuth();
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		api
			.dashboard(token)
			.then(setDashboard)
			.catch((loadError) =>
				setError(errorMessage(loadError, "Gagal memuat dashboard")),
			);
	}, [token]);

	return (
		<section>
			<h2 className="section-title">Ringkasan Klinik</h2>
			{error && <p className="status-line error">{error}</p>}
			<div className="metrics-grid">
				<StatCard
					label="Total Pasien"
					value={dashboard?.totalPatients ?? 0}
					accent
				/>
				<StatCard
					label="Total Pasien Hari Ini"
					value={dashboard?.todayPatients ?? 0}
				/>
				<StatCard
					label="Total Antrean Hari Ini"
					value={dashboard?.todayQueue ?? 0}
				/>
				<StatCard
					label="Total Pasien Menunggu"
					value={dashboard?.waitingPatients ?? 0}
				/>
				<StatCard
					label="Total Pasien Selesai Dilayani"
					value={dashboard?.finishedPatients ?? 0}
				/>
			</div>
		</section>
	);
}
