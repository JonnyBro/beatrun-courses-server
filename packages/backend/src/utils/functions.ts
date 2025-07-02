import { getCollection } from "@/plugins/mongo";
import { type CourseData, type SteamUser, User } from "@/types";
import { FastifyInstance } from "fastify";

const charsList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const createUser = async (fastify: FastifyInstance, data: SteamUser | string) => {
	const users = getCollection(fastify, "users");

	let key: string;
	do key = generateRandomString(randomNum(16, 32));
	while (await users.findOne({ key }));

	const isSUser = isSteamUser(data);

	const res = await users.findOneAndUpdate(
		{ steamId: isSUser ? data.steamid : data },
		{
			$set: {
				username: isSUser ? data.personaname : undefined,
				createdAt: Date.now(),
				key,
			},
		},
		{
			upsert: true,
			returnDocument: "after",
		},
	);

	return res as User;
};

export const getUserFromSteam = async (fastify: FastifyInstance, data: SteamUser | string) => {
	const users = getCollection(fastify, "users");
	const user = await users.findOne({ steamId: isSteamUser(data) ? data.steamid : data });
	if (!user) return await createUser(fastify, data);
	return user as User;
};

export const getUserFromKey = async (fastify: FastifyInstance, key: string) => {
	const users = getCollection(fastify, "users");
	const user = await users.findOne({ key });
	if (!user) throw new Error("User from key not found");
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

export const sanitize = (string: string, forceLowercase = false, strict = false) => {
	if (!string) return;

	string = string.toString().trim();

	let clean = string.replace(
		/[~`!@#$%^&*()=+[\]{}|\\;:'",<.>/?\u2018\u2019\u201C\u201D\u2013\u2014–—]/g,
		"",
	);
	clean = clean.replace(/&#\d+;/g, "");

	if (strict) clean = clean.replace(/\s+/g, "-").replace(/[^\u0400-\u04FF\w-]/g, "");

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

export const randomNum = (min: number = 0, max: number = 100) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

export const generateCode = (codeLength: number, blocksLength: number) => {
	let code = "";

	for (let i = 0; i < codeLength; i++) {
		code += generateRandomString(blocksLength);
		if (i !== codeLength - 1) code += "-";
	}

	return code.toUpperCase();
};

export const isSteamUser = (profile: SteamUser | string) => typeof profile !== "string";
