import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// src/ and dist/ are at the same depth, so this is the repository root from both
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env");

// Variables that are already set (docker, pm2, the shell) win over the file
if (existsSync(envPath)) process.loadEnvFile(envPath);

const errors: string[] = [];

const string = (name: string, fallback?: string) => {
	const value = process.env[name]?.trim() || fallback;
	if (value === undefined) errors.push(`${name} is required`);

	return value ?? "";
};

const number = (name: string, fallback: number) => {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;

	const value = Number(raw);
	if (!Number.isInteger(value)) errors.push(`${name} must be a whole number, got "${raw}"`);

	return value;
};

const boolean = (name: string, fallback: boolean) => {
	const raw = process.env[name]?.trim().toLowerCase();
	if (!raw) return fallback;
	if (raw === "true" || raw === "1") return true;
	if (raw === "false" || raw === "0") return false;

	errors.push(`${name} must be true or false, got "${raw}"`);

	return fallback;
};

const config = {
	host: string("HOST", "0.0.0.0"),
	port: number("PORT", 6547),
	production: boolean("PRODUCTION", true),
	isBehindProxy: boolean("BEHIND_PROXY", false),
	mongo: string("MONGO_URL"),
	domain: string("DOMAIN").replace(/\/+$/, ""),
	secret: string("SESSION_SECRET"),
	steamApiKey: string("STEAM_API_KEY", ""),
};

if (config.secret && config.secret.length < 32) errors.push("SESSION_SECRET must be at least 32 characters long");

if (errors.length) {
	console.error(
		`[config] ${existsSync(envPath) ? envPath : "No .env file found, expected it at " + envPath}\n` +
			errors.map(e => `  - ${e}`).join("\n"),
	);
	process.exit(1);
}

export default config;
