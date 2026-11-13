import config from "@/config.js";
import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import maxmind, { CountryResponse, Reader } from "maxmind";
import { dirname } from "path";
import { gunzipSync } from "zlib";

const CHECK_EVERY = 24 * 60 * 60 * 1000;

let reader: Reader<CountryResponse> | undefined;

// DB-IP Lite: free, no account, CC BY 4.0 (the site credits it next to the countries). A new file comes out every month
const url = (date: Date) =>
	`https://download.db-ip.com/free/dbip-country-lite-${date.toISOString().slice(0, 7)}.mmdb.gz`;

const startOfMonth = (date: Date, offset = 0) =>
	new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));

const download = async (months: Date[]) => {
	for (const date of months) {
		const res = await fetch(url(date), { signal: AbortSignal.timeout(60_000) });
		if (res.ok) return { from: url(date), data: gunzipSync(Buffer.from(await res.arrayBuffer())) };

		console.log(`[geoip] ${url(date)}: ${res.status}`);
	}
};

const open = async (path: string, watch = false) => {
	const db = await maxmind.open<CountryResponse>(path, { watchForUpdates: watch });
	if (db.get("8.8.8.8")?.country?.iso_code !== "US") throw new Error("The file doesn't look like a country database");

	return db;
};

/** Downloads this month's database, last month's when there isn't one yet. False when there was nothing to download */
export const updateGeoIp = async (months = [new Date(), startOfMonth(new Date(), -1)]) => {
	const result = await download(months);
	if (!result) return false;

	const temp = `${config.geoipPath}.tmp`;

	mkdirSync(dirname(config.geoipPath), { recursive: true });
	writeFileSync(temp, result.data);

	try {
		await open(temp);
	} catch (e) {
		rmSync(temp);
		throw e;
	}

	// A rename is atomic, a running server never sees half a file and its watcher reloads the new one
	renameSync(temp, config.geoipPath);

	console.log(`[geoip] ${result.from} -> ${config.geoipPath} (${(result.data.length / 1024 / 1024).toFixed(1)} MB)`);

	return true;
};

const isOutdated = () => !existsSync(config.geoipPath) || statSync(config.geoipPath).mtime < startOfMonth(new Date());

const check = async () => {
	try {
		if (!isOutdated()) return;

		// The file is from an earlier month, only a newer one is worth it. Early in the month it may not be out yet
		const updated = await updateGeoIp(existsSync(config.geoipPath) ? [new Date()] : undefined);
		if (updated && !reader) reader = await open(config.geoipPath, true);
	} catch (e) {
		console.error("[geoip] Update failed:", e);
	}
};

/** Countries are optional, without the database they are just not shown */
export const loadGeoIp = async () => {
	if (existsSync(config.geoipPath)) {
		reader = await open(config.geoipPath, true).catch((e: unknown) => {
			console.error("[geoip] Can't read the database:", e);
			return undefined;
		});
	}

	if (!config.geoipAutoUpdate) {
		if (!reader) console.log(`[geoip] No database at ${config.geoipPath}, countries are not shown`);
		return;
	}

	// In the background, the server doesn't wait for the download
	void check();
	setInterval(() => void check(), CHECK_EVERY).unref();
};

/** ISO 3166-1 alpha-2 code */
export const ipCountry = (ip: string | undefined) => {
	if (!reader || !ip || !maxmind.validate(ip)) return;

	return reader.get(ip)?.country?.iso_code;
};
