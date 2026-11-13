import { createHash } from "crypto";
import { ensureIndex } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "007-hashed-keys",
	description: "Store only the SHA-256 of game keys",
	up: async db => {
		const users = db.collection("users");
		const withKeys = await users.find({ key: { $type: "string" } }, { projection: { key: 1 } }).toArray();

		if (withKeys.length) {
			await users.bulkWrite(
				withKeys.map(user => ({
					updateOne: {
						filter: { _id: user._id },
						update: {
							$set: {
								keyHash: createHash("sha256")
									.update(user.key as string)
									.digest("hex"),
							},
							$unset: { key: "" },
						},
					},
				})),
			);
		}

		await users.updateMany({ key: { $exists: true } }, { $unset: { key: "" } });

		const oldIndex = (await users.indexes()).find(
			index => JSON.stringify(index.key) === JSON.stringify({ key: 1 }),
		);
		if (oldIndex?.name) await users.dropIndex(oldIndex.name);

		await ensureIndex(
			db,
			"users",
			{ keyHash: 1 },
			{ unique: true, partialFilterExpression: { keyHash: { $type: "string" } } },
		);

		console.log(`[migrations] Hashed ${withKeys.length} game key(s)`);
	},
} satisfies Migration;
