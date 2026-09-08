import { useEffect } from "react";

export function Modal({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div className="modal-backdrop">
			<button
				type="button"
				className="modal-backdrop-close"
				aria-label="Tutup modal"
				onClick={onClose}
			/>
			<div
				className="modal-card"
				role="dialog"
				aria-modal="true"
				aria-label={title}
			>
				<div className="modal-header">
					<h3>{title}</h3>
					<button
						type="button"
						className="icon-button"
						onClick={onClose}
						aria-label="Tutup"
					>
						×
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
