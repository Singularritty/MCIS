export function Skeleton({
	className = "",
	height,
	width,
}: {
	className?: string;
	height?: number | string;
	width?: number | string;
}) {
	return (
		<div
			className={`skeleton ${className}`}
			style={{ height, width }}
			aria-hidden="true"
		/>
	);
}
