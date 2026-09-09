import { Lock, LogIn, Stethoscope, User } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { errorMessage, useAuth } from "~/lib/auth";
import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Login - Mini Clinic Information System" },
		{ name: "description", content: "Masuk ke sistem informasi klinik." },
	];
}

export default function Login() {
	const { token, login } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ username: "admin", password: "admin123" });
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (token) {
		return <Navigate to="/" replace />;
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await login(form.username, form.password);
			navigate("/", { replace: true });
		} catch (submitError) {
			setError(errorMessage(submitError, "Login gagal"));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="login-shell">
			<section className="login-card">
				<span className="login-icon">
					<Stethoscope size={22} strokeWidth={2.2} />
				</span>
				<p className="eyebrow">MCIS</p>
				<h1>Mini Clinic Information System</h1>
				<p className="subtext">
					Login sebagai Administrator, Dokter, atau Petugas Pendaftaran.
				</p>
				<form onSubmit={handleSubmit} className="login-form">
					<label>
						<span>Username</span>
						<div className="icon-input">
							<User size={16} strokeWidth={2.2} aria-hidden="true" />
							<input
								value={form.username}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										username: event.target.value,
									}))
								}
								required
							/>
						</div>
					</label>
					<label>
						<span>Password</span>
						<div className="icon-input">
							<Lock size={16} strokeWidth={2.2} aria-hidden="true" />
							<input
								type="password"
								value={form.password}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										password: event.target.value,
									}))
								}
								required
							/>
						</div>
					</label>
					<div className="login-actions">
						<button type="submit" disabled={submitting}>
							<LogIn size={16} strokeWidth={2.4} />
							{submitting ? "Memproses..." : "Masuk"}
						</button>
					</div>
				</form>
				<div className="hint-box">
					<strong>Demo akun:</strong>
					<p>admin / admin123</p>
					<p>dokter / dokter123</p>
					<p>registrar / registrar123</p>
				</div>
				{error && <p className="status-line error">{error}</p>}
			</section>
		</main>
	);
}
