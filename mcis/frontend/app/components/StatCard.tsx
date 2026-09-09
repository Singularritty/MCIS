import type { LucideIcon } from "lucide-react";
import { Skeleton } from "~/components/Skeleton";

export function StatCard({
	label,
	value,
	icon: Icon,
	accent = false,
	loading = false,
}: {
	label: string;
	value: number | string;
	icon: LucideIcon;
	accent?: boolean;
	loading?: boolean;
}) {
	return (
		<div className={`metric-card${accent ? " accent" : ""}`}>
			<div className="metric-card-head">
				<p>{label}</p>
				<span className="metric-card-icon">
					<Icon size={16} strokeWidth={2.2} />
				</span>
			</div>
			{loading ? <Skeleton height={34} width={64} /> : <h2>{value}</h2>}
		</div>
	);
}
