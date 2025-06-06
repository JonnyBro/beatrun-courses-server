import { FastifyInstance } from "fastify";
import { type SteamUser, User } from "../types";

const createUser = async (fastify: FastifyInstance, profile: SteamUser) => {
	const users = fastify.mongo.db?.collection<User>("users");
	if (!users) throw new Error("Users collection does not exists");

	let key = generateRandomString(32);

	while (true) {
		const existingUser = await users.findOne({ key });

		if (!existingUser) {
			const res = await users.findOneAndUpdate(
				{ steamId: profile.steamid },
				{ $set: { username: profile.personaname, createdAt: Date.now(), key } },
				{
					upsert: true,
					returnDocument: "after",
				},
			);

			return res as User;
		}

		key = generateRandomString(32);
	}
};

export const getUser = async (fastify: FastifyInstance, data: SteamUser | string) => {
	const users = fastify.mongo.db?.collection<User>("users");
	if (!users) throw new Error("Users collection does not exist");

	if (typeof data === "string") {
		const user = await users.findOne({ steamId: data });
		return user;
	}

	const user = await users.findOne({ steamId: data.steamid });
	if (!user) return await createUser(fastify, data);

	return user;
};

export const generateRandomString = (
	length: number,
	chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
) => {
	let result = "";
	const charactersLength = chars.length;

	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result;
};
