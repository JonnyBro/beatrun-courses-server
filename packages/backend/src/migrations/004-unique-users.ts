import { ensureIndex, findDuplicates, removeDuplicates } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "004-unique-users",
	description: "Remove duplicated users and make steamId and key unique",
	up: async db => {
		await removeDuplicates(db, "users", { steamId: "$steamId" });
		await ensureIndex(db, "users", { steamId: 1 }, { unique: true });

		const users = db.collection("users");
		const sharedKeys = await findDuplicates(users, { key: "$key" }, { key: { $type: "string" } });

		for (const { ids } of sharedKeys) {
			await users.updateMany({ _id: { $in: ids.slice(1) } }, { $unset: { key: "" } });
		}

		if (sharedKeys.length) console.log(`[migrations] Removed ${sharedKeys.length} shared API key(s)`);

		await ensureIndex(
			db,
			"users",
			{ key: 1 },
			{ unique: true, partialFilterExpression: { key: { $type: "string" } } },
		);
	},
} satisfies Migration;
