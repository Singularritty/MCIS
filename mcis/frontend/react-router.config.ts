import type { Config } from "@react-router/dev/config";

export default {
	// MCIS is an authenticated internal dashboard with no SEO/SSR need,
	// so it runs as a client-rendered SPA (avoids localStorage/token hydration mismatches).
	ssr: false,
} satisfies Config;
