import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const findEnvFile = () => {
	let currentDir = process.cwd();
	for (let index = 0; index < 10; index += 1) {
		const envPath = path.join(currentDir, ".env");
		if (existsSync(envPath)) {
			return envPath;
		}
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			return null;
		}
		currentDir = parentDir;
	}
	return null;
};

// Bun only auto-loads a `.env` from the current working directory, but this
// backend is sometimes run from `mcis/backend` (e.g. `bun test`) rather than
// the repo root where `.env` actually lives -- so walk up for it explicitly.
const parseEnvFile = (): Record<string, string> => {
	const envFile = findEnvFile();
	if (!envFile) return {};
	const rawContent = readFileSync(envFile, "utf8");
	const entries: Record<string, string> = {};
	for (const line of rawContent.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex === -1) continue;
		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed
			.slice(separatorIndex + 1)
			.trim()
			.replace(/^['"]|['"]$/g, "");
		entries[key] = value;
	}
	return entries;
};

const fileEnv = parseEnvFile();

export const readEnv = (key: string): string | undefined =>
	process.env[key] ?? fileEnv[key];
