import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { ApiError, type AuthUser, api, type UserRole } from "./api";

type AuthContextValue = {
	token: string | null;
	user: AuthUser | null;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	can: (...roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredUser = (): AuthUser | null => {
	const raw = window.localStorage.getItem("mcis-user");
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(() =>
		window.localStorage.getItem("mcis-token"),
	);
	const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

	const login = useCallback(async (username: string, password: string) => {
		const result = await api.login(username, password);
		setToken(result.token);
		setUser(result.user);
		window.localStorage.setItem("mcis-token", result.token);
		window.localStorage.setItem("mcis-user", JSON.stringify(result.user));
	}, []);

	const logout = useCallback(() => {
		setToken((currentToken) => {
			if (currentToken) {
				api.logout(currentToken).catch(() => {
					// JWT logout is a client-side token discard; ignore network failures.
				});
			}
			return null;
		});
		setUser(null);
		window.localStorage.removeItem("mcis-token");
		window.localStorage.removeItem("mcis-user");
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			token,
			user,
			login,
			logout,
			can: (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
		}),
		[token, user, login, logout],
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
