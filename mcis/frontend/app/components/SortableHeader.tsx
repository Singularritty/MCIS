import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

export type SortOrder = "asc" | "desc";

export function SortableHeader<T extends string>({
	label,
	sortKey,
	activeKey,
	order,
	onSort,
}: {
	label: string;
	sortKey: T;
	activeKey: T | null;
	order: SortOrder;
	onSort: (key: T) => void;
}) {
	const isActive = activeKey === sortKey;
	return (
		<th>
			<button
				type="button"
				className="sortable-header"
				onClick={() => onSort(sortKey)}
			>
				<span>{label}</span>
				{isActive ? (
					order === "asc" ? (
						<ChevronUp size={14} strokeWidth={2.4} />
					) : (
						<ChevronDown size={14} strokeWidth={2.4} />
					)
				) : (
					<ChevronsUpDown
						size={14}
						strokeWidth={2}
						className="sort-icon-idle"
					/>
				)}
			</button>
		</th>
	);
}
