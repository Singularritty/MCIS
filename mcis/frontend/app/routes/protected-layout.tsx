import {
	ClipboardList,
	LayoutDashboard,
	ListOrdered,
	LogOut,
	Stethoscope,
	Users,
} from "lucide-react";
import { Navigate, NavLink, Outlet } from "react-router";
import { Avatar } from "~/components/Avatar";
import { useAuth } from "~/lib/auth";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
	{ to: "/patients", label: "Data Pasien", icon: Users },
	{ to: "/registrations", label: "Pendaftaran", icon: ClipboardList },
	{ to: "/queue", label: "Antrean", icon: ListOrdered },
	{ to: "/medical-records", label: "Pemeriksaan", icon: Stethoscope },
];

export default function ProtectedLayout() {
	const { token, user, logout } = useAuth();

	if (!token || !user) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<div className="sidebar-brand">
					<span className="sidebar-brand-icon">
						<Stethoscope size={18} strokeWidth={2.4} />
					</span>
					<h1>Mini Clinic Information System</h1>
				</div>
				<nav className="sidebar-nav">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						return (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.end}
								className={({ isActive }) => (isActive ? "active" : "")}
							>
								<Icon size={18} strokeWidth={2.2} />
								<span>{item.label}</span>
							</NavLink>
						);
					})}
				</nav>
				<div className="sidebar-footer">
					<div className="sidebar-user">
						<Avatar name={user.username} />
						<div className="sidebar-user-text">
							<div className="sidebar-user-name">{user.username}</div>
							<div className="sidebar-user-role">{user.role}</div>
						</div>
					</div>
					<button type="button" className="sidebar-logout" onClick={logout}>
						<LogOut size={16} strokeWidth={2.2} />
						<span>Logout</span>
					</button>
				</div>
			</aside>
			<div className="app-main">
				<Outlet />
			</div>
		</div>
	);
}
