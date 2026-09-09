import { Modal } from "~/components/Modal";

export function ConfirmDialog({
	title,
	message,
	confirmLabel = "Ya, Lanjutkan",
	danger = false,
	onConfirm,
	onClose,
}: {
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}) {
	return (
		<Modal title={title} onClose={onClose}>
			<p className="confirm-message">{message}</p>
			<div className="confirm-actions">
				<button type="button" className="btn-secondary" onClick={onClose}>
					Batal
				</button>
				<button
					type="button"
					className={danger ? "btn-danger" : undefined}
					onClick={() => {
						onConfirm();
						onClose();
					}}
				>
					{confirmLabel}
				</button>
			</div>
		</Modal>
	);
}
