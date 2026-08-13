import { SteamUser } from "@/modules/steam.js";
import { CourseData, User } from "@/types.js";
import { FastifyInstance } from "fastify";

const charsList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const createUser = async (fastify: FastifyInstance, data: SteamUser | string, username?: string) => {
	const users = fastify.getUsersCollection();

	let key: string;
	do key = generateRandomString(randomNum(16, 32));
	while (await users?.findOne({ key }));

	const isSUser = isSteamUser(data);

	const res = await users?.findOneAndUpdate(
		{ steamId: isSUser ? data.steamid : data },
		{
			$set: {
				key,
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

export const getUserFromKey = async (fastify: FastifyInstance, key: string) => {
	const users = fastify.getUsersCollection();
	const user = await users?.findOne({ key });
	if (!user) return;

	return user as User;
};

export const generateRandomString = (length: number, chars = charsList) => {
	let result = "";
	const charactersLength = chars.length;

	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * charactersLength));
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

export const isCourseFileValid = (content: CourseData | string) => {
	if (typeof content === "string") content = JSON.parse(content);
	if (content.length !== 6 && content.length !== 7) return false;

	return (
		typeof content[0] === "object" &&
		typeof content[1] === "object" &&
		typeof content[2] === "string" &&
		typeof content[3] === "number" &&
		typeof content[4] === "string" &&
		typeof content[5] === "object" &&
		(content[6] === undefined || typeof content[6] === "number")
	);
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
