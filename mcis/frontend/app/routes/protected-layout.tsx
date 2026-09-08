import { Navigate, NavLink, Outlet } from "react-router";
import { useAuth } from "~/lib/auth";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", end: true },
	{ to: "/patients", label: "Data Pasien" },
	{ to: "/registrations", label: "Pendaftaran" },
	{ to: "/queue", label: "Antrean" },
	{ to: "/medical-records", label: "Pemeriksaan" },
];

export default function ProtectedLayout() {
	const { token, user, logout } = useAuth();

	if (!token || !user) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="clinic-shell">
			<header className="topbar">
				<div>
					<p className="eyebrow">MCIS</p>
					<h1>Mini Clinic Information System</h1>
				</div>
				<div className="topbar-meta">
					<span>
						{user.username} &middot; {user.role}
					</span>
					<button type="button" onClick={logout}>
						Logout
					</button>
				</div>
			</header>
			<nav className="main-nav">
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.end}
						className={({ isActive }) => (isActive ? "active" : "")}
					>
						{item.label}
					</NavLink>
				))}
			</nav>
			<div className="clinic-page">
				<Outlet />
			</div>
		</div>
	);
}
