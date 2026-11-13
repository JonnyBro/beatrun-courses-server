import { SteamUser } from "@/modules/steam.js";
import { User } from "@/types.js";
import { createHash, randomBytes, randomInt } from "crypto";
import { FastifyInstance } from "fastify";

const charsList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const createUser = async (fastify: FastifyInstance, data: SteamUser | string, username?: string) => {
	const users = fastify.getUsersCollection();
	const isSUser = isSteamUser(data);

	const res = await users?.findOneAndUpdate(
		{ steamId: isSUser ? data.steamid : data },
		{
			$set: {
				username: isSUser ? sanitize(data.personaname) : sanitize(username),
				createdAt: Date.now(),
				admin: false,
			},
		},
		{
			upsert: true,
			returnDocument: "after",
		},
	);

	return res as User;
};

export const getUserFromSteamId = async (fastify: FastifyInstance, data: SteamUser | string) => {
	const user = await fastify.getUser(isSteamUser(data) ? data.steamid : data);
	if (!user) return;

	return user;
};

// The key is 192 random bits, so a plain fast hash is enough here, a slow one only matters for guessable passwords
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** The key itself is shown to the user once, only its hash is stored */
export const generateKey = () => {
	const key = randomBytes(24).toString("base64url");

	return { key, keyHash: hashKey(key) };
};

export const getUserFromKey = async (fastify: FastifyInstance, key: string) => {
	if (!key) return;

	const user = await fastify.getUsersCollection()?.findOne({ keyHash: hashKey(key) });
	if (!user) return;

	return user as User;
};

export const generateRandomString = (length: number, chars = charsList) => {
	let result = "";
	const charactersLength = chars.length;

	for (let i = 0; i < length; i++) {
		result += chars.charAt(randomInt(charactersLength));
	}

	return result;
};

export const sanitize = (string?: string, forceLowercase = false, strict = false) => {
	if (!string) return;

	string = string.toString().trim();

	let clean = string.replace(/[~`!@#$%^&*()=+[\]{}|\\;:'",<.>/?\u2018\u2019\u201C\u201D\u2013\u2014–—]/g, "");
	clean = clean.replace(/&#\d+;/g, "");

	if (strict) clean = clean.replace(/\s+/g, "_").replace(/[^\u0400-\u04FF\w-]/g, "");

	return forceLowercase ? clean.toLowerCase() : clean;
};

export const randomNum = (min: number = 0, max: number = 100) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateCode = (blocksCount: number, blockLength: number) => {
	let code = "";

	for (let i = 0; i < blocksCount; i++) {
		code += generateRandomString(blockLength);
		if (i !== blocksCount - 1) code += "-";
	}

	return code.toUpperCase();
};

export const isSteamUser = (profile: SteamUser | string) => typeof profile !== "string";
