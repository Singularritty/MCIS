import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

export function Select({
	value,
	onChange,
	options,
	placeholder = "Pilih",
	compact = false,
	labelledBy,
}: {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	placeholder?: string;
	compact?: boolean;
	labelledBy?: string;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const selected = options.find((option) => option.value === value);

	useEffect(() => {
		if (!open) return;
		const handlePointerDown = (event: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	return (
		<div
			className={`select-root${compact ? " select-compact" : ""}`}
			ref={rootRef}
		>
			<button
				type="button"
				className="select-trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-labelledby={labelledBy}
				onClick={() => setOpen((current) => !current)}
			>
				<span className={selected ? "select-value" : "select-placeholder"}>
					{selected ? selected.label : placeholder}
				</span>
				<span className="select-caret" aria-hidden="true">
					▾
				</span>
			</button>
			{open && (
				<ul className="select-options">
					{options.map((option) => (
						<li key={option.value}>
							<button
								type="button"
								role="option"
								aria-selected={option.value === value}
								className={`select-option${option.value === value ? " selected" : ""}`}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
							>
								{option.label}
							</button>
						</li>
					))}
					{options.length === 0 && (
						<li className="select-empty">Tidak ada opsi</li>
					)}
				</ul>
			)}
		</div>
	);
}
