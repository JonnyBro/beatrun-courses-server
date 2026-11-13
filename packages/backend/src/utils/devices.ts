import { mongodb } from "@fastify/mongodb";
import { createHash, randomBytes } from "crypto";
import { FastifyInstance } from "fastify";
import { generateRandomString } from "./functions.js";
import { ipCountry } from "./geoip.js";

/** A token nobody used for this long is deleted by the TTL index */
export const DEVICE_LIFETIME = 90 * 24 * 60 * 60 * 1000;
export const LINK_LIFETIME = 10 * 60 * 1000;
export const POLL_INTERVAL = 5;
// Every use pushes the expiry forward, but writing that on every request isn't worth it
const TOUCH_AFTER = 60 * 60 * 1000;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface Device {
	_id: mongodb.ObjectId;
	steamId: string;
	tokenHash: string;
	/** legacy: a game key from before devices, moved here by a migration */
	kind: "game" | "legacy";
	/** Set by the player on the site */
	name?: string;
	/** What the game said about itself when signing in, can't be verified */
	system?: DeviceSystem;
	signInIp?: string;
	lastIp?: string;
	createdAt: Date;
	lastUsedAt: Date;
	expiresAt: Date;
}

export type DeviceSystem = { os: "windows" | "linux" | "osx"; branch: string };

export interface DeviceLink {
	/** The code shown in the game and on the site */
	_id: string;
	/** Only the game that asked for the code knows the poll secret, so a code seen on a stream gives nothing */
	pollHash: string;
	/** Set when the player confirms the code on the site */
	steamId?: string;
	system?: DeviceSystem;
	expiresAt: Date;
}

export const devices = (fastify: FastifyInstance) =>
	fastify.getCollection("devices")! as never as mongodb.Collection<Device>;
export const deviceLinks = (fastify: FastifyInstance) =>
	fastify.getCollection("deviceLinks")! as never as mongodb.Collection<DeviceLink>;

// Tokens are 192 random bits, a slow hash only matters for guessable passwords
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const generateSecret = () => {
	const secret = randomBytes(24).toString("base64url");

	return { secret, hash: hashToken(secret) };
};

/** XXXX-XXXX, anything else the player typed around it is ignored */
export const normalizeLinkCode = (code: string) => {
	const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

	return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : undefined;
};

const OS = new Set(["windows", "linux", "osx"]);

/** The game's own report, anything odd is dropped instead of refusing the sign-in */
export const parseSystem = (os: unknown, branch: unknown): DeviceSystem | undefined => {
	if (typeof os !== "string" || !OS.has(os)) return;

	return {
		os: os as DeviceSystem["os"],
		branch: typeof branch === "string" && /^[\w-]{1,32}$/.test(branch) ? branch : "unknown",
	};
};

export const createLink = async (fastify: FastifyInstance, system: DeviceSystem | undefined) => {
	const { secret, hash } = generateSecret();
	const raw = generateRandomString(8, CODE_CHARS);
	const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;

	await deviceLinks(fastify).insertOne({
		_id: code,
		pollHash: hash,
		...(system && { system }),
		expiresAt: new Date(Date.now() + LINK_LIFETIME),
	});

	return { code, poll: secret };
};

export const createDevice = async (
	fastify: FastifyInstance,
	steamId: string,
	system: DeviceSystem | undefined,
	ip: string,
) => {
	const { secret, hash } = generateSecret();
	const now = new Date();

	await devices(fastify).insertOne({
		_id: new mongodb.ObjectId(),
		steamId,
		tokenHash: hash,
		kind: "game",
		...(system && { system }),
		signInIp: ip,
		lastIp: ip,
		createdAt: now,
		lastUsedAt: now,
		expiresAt: new Date(now.getTime() + DEVICE_LIFETIME),
	});

	return secret;
};

export const getDeviceFromToken = async (fastify: FastifyInstance, token: string | undefined, ip: string) => {
	if (!token) return;

	const device = await devices(fastify).findOne({ tokenHash: hashToken(token) });
	// The TTL monitor runs once a minute, so an expired token can still be in the collection for a bit
	if (!device || device.expiresAt <= new Date()) return;

	if (device.lastIp !== ip || Date.now() - device.lastUsedAt.getTime() >= TOUCH_AFTER) {
		await devices(fastify).updateOne(
			{ _id: device._id },
			{ $set: { lastIp: ip, lastUsedAt: new Date(), expiresAt: new Date(Date.now() + DEVICE_LIFETIME) } },
		);
	}

	const user = await fastify.getUser(device.steamId);

	return user && { user, device };
};

export const getUserFromToken = async (fastify: FastifyInstance, token: string | undefined, ip: string) =>
	(await getDeviceFromToken(fastify, token, ip))?.user;

export const toPublicDevice = (device: Device) => ({
	id: device._id.toString(),
	kind: device.kind,
	name: device.name ?? null,
	system: device.system ?? null,
	signInIp: device.signInIp ?? null,
	signInCountry: ipCountry(device.signInIp) ?? null,
	lastIp: device.lastIp ?? null,
	lastCountry: ipCountry(device.lastIp) ?? null,
	createdAt: device.createdAt.getTime(),
	lastUsedAt: device.lastUsedAt.getTime(),
	expiresAt: device.expiresAt.getTime(),
});
