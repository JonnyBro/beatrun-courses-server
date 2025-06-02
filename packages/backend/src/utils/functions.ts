// import { FastifyInstance } from "fastify";

// const createKey = async (fastify: FastifyInstance, user: any) => {
// 	user = typeof user === "string" ? user : user.steamid;

// 	const keys = fastify.mongo.db?.collection("keys");
// 	const key = generateRandomString();
// 	const isFound = keys[key];

// 	if (!isFound) {
// 		keys[user] = key;

// 		const now = Date.now();

// 		await log(
// 			`[KEY] New user (SteamID: ${user}, Key: ${key}, TimeCreated: ${new Date(now).toLocaleString("ru-RU")}).`,
// 			`[KEY] New user (SteamID: \`${user}\`, Key: \`${key}\`, TimeCreated: <t:${Math.floor(now / 1000)}:f>).`,
// 		);
// 		await db.push("/keys", keys);

// 		return key;
// 	} else return await createKey(db, user);
// };

// export { createKey };
