import { FastifyInstance } from "fastify";
import { User } from "../plugins/mongo";

export const createAuthKey = async (fastify: FastifyInstance, steamId: string) => {
	const users = fastify.mongo.db?.collection<User>("users");
	if (!users) return { code: 404, message: "Users collection not found" };

	let key = generateRandomString(32);

	while (true) {
		const existingUser = await users.findOne({ key });

		if (!existingUser) {
			await users.updateOne({ steamId }, { $set: { key } });

			return { code: 200, message: key };
		}

		key = generateRandomString(32);
	}
};

export const getAuthKey = async (fastify: FastifyInstance, steamId: string) => {
	const users = fastify.mongo.db?.collection<User>("users");
	if (!users) return { code: 404, message: "Users collection not found" };

	const user = await users.findOne({ steamId });
	if (!user) return { code: 404, message: "User not found" };

	return user.key;
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
