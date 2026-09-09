import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	ApiError,
	type AuthUser,
	api,
	setUnauthorizedHandler,
	type UserRole,
} from "./api";

type AuthContextValue = {
	token: string | null;
	user: AuthUser | null;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	can: (...roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const decodeJwtExpiry = (token: string): number | null => {
	try {
		const payloadSegment = token.split(".")[1];
		if (!payloadSegment) return null;
		const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
		const json = atob(normalized);
		const payload = JSON.parse(json) as { exp?: number };
		return typeof payload.exp === "number" ? payload.exp * 1000 : null;
	} catch {
		return null;
	}
};

const isTokenExpired = (token: string): boolean => {
	const expiresAt = decodeJwtExpiry(token);
	if (expiresAt === null) return false;
	return Date.now() >= expiresAt;
};

const clearStoredSession = () => {
	window.localStorage.removeItem("mcis-token");
	window.localStorage.removeItem("mcis-user");
};

// Reject an expired token before it's ever used to render protected content,
// instead of letting the page render and only discover it's invalid once an
// API call comes back 401.
const readStoredSession = (): {
	token: string | null;
	user: AuthUser | null;
} => {
	const storedToken = window.localStorage.getItem("mcis-token");
	const storedUserRaw = window.localStorage.getItem("mcis-user");
	if (!storedToken || !storedUserRaw) {
		return { token: null, user: null };
	}
	if (isTokenExpired(storedToken)) {
		clearStoredSession();
		return { token: null, user: null };
	}
	try {
		return { token: storedToken, user: JSON.parse(storedUserRaw) as AuthUser };
	} catch {
		clearStoredSession();
		return { token: null, user: null };
	}
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState(() => readStoredSession());

	const login = useCallback(async (username: string, password: string) => {
		const result = await api.login(username, password);
		setSession({ token: result.token, user: result.user });
		window.localStorage.setItem("mcis-token", result.token);
		window.localStorage.setItem("mcis-user", JSON.stringify(result.user));
	}, []);

	const logout = useCallback(() => {
		setSession((current) => {
			if (current.token) {
				api.logout(current.token).catch(() => {
					// JWT logout is a client-side token discard; ignore network failures.
				});
			}
			return { token: null, user: null };
		});
		clearStoredSession();
	}, []);

	useEffect(() => {
		setUnauthorizedHandler(logout);
		return () => setUnauthorizedHandler(null);
	}, [logout]);

	const value = useMemo<AuthContextValue>(
		() => ({
			token: session.token,
			user: session.user,
			login,
			logout,
			can: (...roles: UserRole[]) =>
				Boolean(session.user && roles.includes(session.user.role)),
		}),
		[session, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

export function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}
