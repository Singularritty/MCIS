const STATUS_CLASS: Record<string, string> = {
	Menunggu: "status-waiting",
	"Check In": "status-checkin",
	Pemeriksaan: "status-exam",
	Selesai: "status-done",
};

export function StatusBadge({ status }: { status: string }) {
	return (
		<span className={`status-badge ${STATUS_CLASS[status] ?? ""}`}>
			{status}
		</span>
	);
}
