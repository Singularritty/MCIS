import { CheckCircle2, XCircle } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
	showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const idRef = useRef(0);

	const dismiss = useCallback((id: number) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const showToast = useCallback(
		(message: string, kind: ToastKind = "success") => {
			const id = ++idRef.current;
			setToasts((current) => [...current, { id, message, kind }]);
			setTimeout(() => dismiss(id), 4200);
		},
		[dismiss],
	);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="toast-stack">
				{toasts.map((toast) => (
					<button
						key={toast.id}
						type="button"
						className={`toast toast-${toast.kind}`}
						onClick={() => dismiss(toast.id)}
					>
						{toast.kind === "success" ? (
							<CheckCircle2 size={18} strokeWidth={2.2} />
						) : (
							<XCircle size={18} strokeWidth={2.2} />
						)}
						<span>{toast.message}</span>
					</button>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
