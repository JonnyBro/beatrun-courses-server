import type { PublicUser } from "@/api/types";
import { currentLocale, i18n } from "@/i18n";

/**
 * Formats seconds like the game does (string.FormattedTime with "%02i:%02i:%02i"): mm:ss:cc.
 * Hours are added in front for very long runs
 */
export const formatTime = (seconds: number | null | undefined) => {
	if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "--:--:--";

	const totalCs = Math.floor(seconds * 100);
	const cs = totalCs % 100;
	const s = Math.floor(totalCs / 100) % 60;
	const m = Math.floor(totalCs / 6000) % 60;
	const h = Math.floor(totalCs / 360000);

	const pad = (n: number) => String(n).padStart(2, "0");
	return h ? `${h}:${pad(m)}:${pad(s)}:${pad(cs)}` : `${pad(m)}:${pad(s)}:${pad(cs)}`;
};

/** Exact time for tooltips */
export const formatTimePrecise = (seconds: number | null | undefined) =>
	seconds === null || seconds === undefined || !Number.isFinite(seconds) ? "" : `${seconds.toFixed(3)}s`;

/** Difference to another time, e.g. +1.234 */
export const formatGap = (time: number, best: number) => {
	const diff = time - best;
	if (diff <= 0) return null;
	return `+${diff.toFixed(2)}`;
};

// Formatters follow the site language. Reading currentLocale inside the functions keeps templates reactive to it
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

const cached = <T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
	key: string,
	create: (locale: string) => T,
) => {
	const locale = currentLocale.value;
	const id = `${locale}:${key}`;

	let formatter = formatters.get(id) as T | undefined;
	if (!formatter) {
		formatter = create(locale);
		formatters.set(id, formatter);
	}
	return formatter;
};

const numberFormat = () => cached("number", l => new Intl.NumberFormat(l));
const compactFormat = () =>
	cached("compact", l => new Intl.NumberFormat(l, { notation: "compact", maximumFractionDigits: 1 }));
const dateFormat = () =>
	cached("date", l => new Intl.DateTimeFormat(l, { year: "numeric", month: "short", day: "numeric" }));
const dateTimeFormat = () =>
	cached(
		"datetime",
		l =>
			new Intl.DateTimeFormat(l, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
	);
const relativeFormat = () => cached("relative", l => new Intl.RelativeTimeFormat(l, { numeric: "auto" }));

export const formatNumber = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : numberFormat().format(n);
export const formatCompact = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : n < 10000 ? numberFormat().format(n) : compactFormat().format(n);

export const formatDate = (timestamp: number | null | undefined) => (timestamp ? dateFormat().format(timestamp) : "—");

export const formatDateTime = (timestamp: number | null | undefined) =>
	timestamp ? dateTimeFormat().format(timestamp) : "—";

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

export const formatRelative = (timestamp: number | null | undefined) => {
	if (!timestamp) return "—";

	const seconds = (timestamp - Date.now()) / 1000;
	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size) return relativeFormat().format(Math.round(seconds / size), unit);
	}
	return relativeFormat().format(0, "second");
};

export const displayName = (user: Pick<PublicUser, "username" | "steamId"> | null | undefined) =>
	user?.username || user?.steamId || i18n.global.t("common.unknown");

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0].toUpperCase())
		.join("") || "?";

export const workshopUrl = (id: string) => `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;
export const steamProfileUrl = (steamId: string) => `https://steamcommunity.com/profiles/${steamId}`;
