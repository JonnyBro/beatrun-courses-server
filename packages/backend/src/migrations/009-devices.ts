import { ensureCollection, ensureIndex } from "./helpers.js";
import { Migration } from "./types.js";

const LIFETIME = 90 * 24 * 60 * 60 * 1000;

export default {
	id: "009-devices",
	description: "Replace game keys with per-device tokens",
	up: async db => {
		await ensureCollection(db, "devices");
		await ensureCollection(db, "deviceLinks");

		await ensureIndex(db, "devices", { tokenHash: 1 }, { unique: true });
		await ensureIndex(db, "devices", { steamId: 1 });
		await db.collection("devices").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

		await ensureIndex(db, "deviceLinks", { pollHash: 1 }, { unique: true });
		await db.collection("deviceLinks").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

		// Old game versions still send the key, as a device it keeps working and can be removed on the site
		const users = db.collection("users");
		const withKeys = await users
			.find({ keyHash: { $type: "string" } }, { projection: { steamId: 1, keyHash: 1 } })
			.toArray();
		const now = new Date();

		if (withKeys.length) {
			await db.collection("devices").insertMany(
				withKeys.map(user => ({
					steamId: user.steamId as string,
					tokenHash: user.keyHash as string,
					kind: "legacy",
					createdAt: now,
					lastUsedAt: now,
					expiresAt: new Date(now.getTime() + LIFETIME),
				})),
			);
		}

		await users.updateMany({ keyHash: { $exists: true } }, { $unset: { keyHash: "" } });

		const oldIndex = (await users.indexes()).find(
			index => JSON.stringify(index.key) === JSON.stringify({ keyHash: 1 }),
		);
		if (oldIndex?.name) await users.dropIndex(oldIndex.name);

		console.log(`[migrations] Moved ${withKeys.length} game key(s) to devices`);
	},
} satisfies Migration;
