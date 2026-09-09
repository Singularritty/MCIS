const PALETTE = [
	"#38bdf8",
	"#a78bfa",
	"#f472b6",
	"#fb923c",
	"#34d399",
	"#facc15",
	"#60a5fa",
	"#f87171",
];

function hashString(value: string) {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

function initialsOf(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const initials = parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return initials || "?";
}

export function Avatar({ name }: { name: string }) {
	const color = PALETTE[hashString(name) % PALETTE.length];
	return (
		<span className="avatar" style={{ background: color }}>
			{initialsOf(name)}
		</span>
	);
}
