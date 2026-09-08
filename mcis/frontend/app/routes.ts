import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	route("login", "routes/login.tsx"),
	layout("routes/protected-layout.tsx", [index("routes/dashboard.tsx")]),
] satisfies RouteConfig;
