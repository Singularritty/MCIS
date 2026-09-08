export function StatCard({
	label,
	value,
	accent = false,
}: {
	label: string;
	value: number | string;
	accent?: boolean;
}) {
	return (
		<div className={`metric-card${accent ? " accent" : ""}`}>
			<p>{label}</p>
			<h2>{value}</h2>
		</div>
	);
}
